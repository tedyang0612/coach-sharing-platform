"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import FilterPill from "@/components/FilterPill";
import {
  DEFAULT_CITY,
  hasActiveFilters,
  isDateRangeInvalid,
  isTimeRangeInvalid,
  type CourseFilters as Filters,
} from "@/lib/courses/filterCourses";
import {
  FILTER_LEVELS,
  LEVEL_LABELS,
  PRICE_RANGES,
  SPORT_CHIP_ORDER,
  TIME_SLOT_LABELS,
  type TimeSlot,
  WEEKDAYS,
  WEEKDAY_LABELS,
} from "@/lib/courses/types";

interface Props {
  cities: string[];
  districtsByCity: Record<string, string[]>;
  value: Filters;
}

type LocationState = "idle" | "loading" | "denied" | "error";

// 星期與快速時段的顯示文字（下拉按鈕和「已套用條件」標籤共用）
function weekdaysLabel(weekdays: number[] | undefined) {
  if (!weekdays?.length) return undefined;
  const [first, ...rest] = weekdays;
  return `星期${WEEKDAY_LABELS[first]}${rest.map((day) => `＋${WEEKDAY_LABELS[day]}`).join("")}`;
}

function slotsLabel(slots: TimeSlot[] | undefined) {
  if (!slots?.length) return undefined;
  return slots.map((slot) => TIME_SLOT_LABELS[slot].split("（")[0]).join("＋");
}

// 指定時間的下拉選項：每 30 分鐘一個；網址帶了不在清單內的時間時，補進去才不會顯示成空白
function timeOptions(current: string | undefined) {
  const options = Array.from({ length: 48 }, (_, i) => {
    const h = String(Math.floor(i / 2)).padStart(2, "0");
    return `${h}:${i % 2 ? "30" : "00"}`;
  });
  if (current && !options.includes(current)) {
    options.push(current);
    options.sort();
  }
  return options;
}

// 面板裡的一個選項（單選用 radio、複選用 checkbox）
function PanelOption({
  type,
  name,
  checked,
  onChange,
  children,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-normal text-neutral-800 hover:bg-neutral-50">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-teal-600"
      />
      {children}
    </label>
  );
}

// 「2026-10-20」→「10/20」
function shortDate(date: string) {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
}

// 點「已套用條件」的標籤時，打開對應的膠囊面板並把焦點放上去
function openPill(id: string) {
  const summary = document.getElementById(id);
  const details = summary?.closest("details");
  if (details) details.open = true;
  summary?.scrollIntoView({ block: "center", behavior: "smooth" });
  summary?.focus({ preventScroll: true });
}

interface AppliedTag {
  key: string;
  label: string;
  jumpTo: () => void;
  remove: () => void;
}

// 點「已套用條件」的標籤時，捲到對應的篩選器並把焦點放上去
function focusControl(selector: string) {
  const el = document.querySelector<HTMLElement>(selector);
  el?.scrollIntoView({ block: "center", behavior: "smooth" });
  el?.focus({ preventScroll: true });
}

// 篩選用的 Chip：原生 radio／checkbox 加樣式，單選、複選與鍵盤操作都不用另外寫。
// label 要 relative：隱藏用的 sr-only 輸入框是絕對定位，不加的話手機上會撐寬整頁
function Chip({
  type,
  name,
  value,
  checked,
  onChange,
  title,
  children,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="relative shrink-0 cursor-pointer" title={title}>
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="block whitespace-nowrap rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 transition peer-checked:border-teal-600 peer-checked:bg-teal-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-teal-600 peer-focus-visible:ring-offset-2 hover:border-teal-400">
        {children}
      </span>
    </label>
  );
}

// 在清單裡加入或移除一個值（複選用）
function toggle<T>(list: T[] | undefined, item: T): T[] | undefined {
  const next = list?.includes(item)
    ? list.filter((x) => x !== item)
    : [...(list ?? []), item];
  return next.length ? next : undefined;
}

export default function CourseFilters({
  cities,
  districtsByCity,
  value,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  // 網址沒有任何篩選條件才自動定位；分享連結帶的條件不會被覆蓋
  const canAutoLocate = !hasActiveFilters(value);
  const [locationState, setLocationState] = useState<LocationState>(
    canAutoLocate ? "loading" : "idle",
  );
  const [usedFallback, setUsedFallback] = useState(false);
  const autoStarted = useRef(false);

  // 篩選條件放在網址上，結果可以分享連結，重新整理也不會消失。
  function navigate(next: Filters) {
    const params = new URLSearchParams();
    if (next.city) params.set("city", next.city);
    if (next.city && next.district) params.set("district", next.district);
    if (next.date) params.set("date", next.date);
    if (next.dateTo) params.set("dateTo", next.dateTo);
    if (next.weekdays?.length) params.set("days", next.weekdays.join(","));
    if (next.timeSlots?.length) params.set("slot", next.timeSlots.join(","));
    if (next.timeFrom) params.set("from", next.timeFrom);
    if (next.timeTo) params.set("to", next.timeTo);
    if (next.level) params.set("level", next.level);
    if (next.sport) params.set("sport", next.sport);
    if (next.priceRange) params.set("price", next.priceRange);
    if (next.near) {
      // 只留到小數點後 2 位（約 1 公里），分享連結時不會洩漏精確位置
      params.set("lat", next.near.lat.toFixed(2));
      params.set("lng", next.near.lng.toFixed(2));
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleLocationFailure(state: LocationState, auto: boolean) {
    setLocationState(state);
    // 自動定位失敗時，退回預設城市，列表不會空掉
    if (auto && cities.includes(DEFAULT_CITY)) {
      setUsedFallback(true);
      navigate({ ...value, city: DEFAULT_CITY });
    }
  }

  function requestLocation(auto = false) {
    if (!navigator.geolocation) {
      handleLocationFailure("error", auto);
      return;
    }
    if (!auto) setLocationState("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationState("idle");
        setUsedFallback(false);
        navigate({
          ...value,
          near: { lat: position.coords.latitude, lng: position.coords.longitude },
        });
      },
      (error) =>
        handleLocationFailure(
          error.code === error.PERMISSION_DENIED ? "denied" : "error",
          auto,
        ),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  }

  useEffect(() => {
    if (!canAutoLocate || autoStarted.current) return;
    autoStarted.current = true; // 開發模式下 effect 會跑兩次，避免重複要求
    requestLocation(true);
    // 只在第一次載入時執行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showFallbackNote = usedFallback && value.city === DEFAULT_CITY;

  // 已套用條件：每個條件一個標籤，點標籤跳到對應的篩選器修改，點 ✕ 移除。
  // 地點標籤移除時先清行政區，再按一次才清縣市。
  const appliedTags: AppliedTag[] = [];
  if (value.sport) {
    appliedTags.push({
      key: "sport",
      label: value.sport,
      jumpTo: () => focusControl('input[name="sport"]:checked'),
      remove: () => navigate({ ...value, sport: undefined }),
    });
  }
  if (value.city) {
    appliedTags.push({
      key: "city",
      label: value.district ? `${value.city}・${value.district}` : value.city,
      jumpTo: () => openPill("filter-region"),
      remove: () =>
        navigate(
          value.district
            ? { ...value, district: undefined }
            : { ...value, city: undefined },
        ),
    });
  }
  const dateApplied = (value.date || value.dateTo) && !isDateRangeInvalid(value);
  if (dateApplied) {
    appliedTags.push({
      key: "date",
      label:
        value.date && value.dateTo
          ? `${shortDate(value.date)}–${shortDate(value.dateTo)}`
          : value.date
            ? shortDate(value.date)
            : `${shortDate(value.dateTo!)} 之前`,
      jumpTo: () => openPill("filter-date"),
      remove: () => navigate({ ...value, date: undefined, dateTo: undefined }),
    });
  }
  if (value.weekdays?.length) {
    appliedTags.push({
      key: "weekdays",
      label: weekdaysLabel(value.weekdays) ?? "",
      jumpTo: () => openPill("filter-weekdays"),
      remove: () => navigate({ ...value, weekdays: undefined }),
    });
  }
  const customTimeApplied =
    (value.timeFrom || value.timeTo) && !isTimeRangeInvalid(value);
  if (value.timeSlots?.length) {
    appliedTags.push({
      key: "slots",
      label: slotsLabel(value.timeSlots) ?? "",
      jumpTo: () => openPill("filter-slots"),
      remove: () => navigate({ ...value, timeSlots: undefined }),
    });
  } else if (customTimeApplied) {
    appliedTags.push({
      key: "time",
      label:
        value.timeFrom && value.timeTo
          ? `${value.timeFrom}–${value.timeTo}`
          : value.timeFrom
            ? `${value.timeFrom} 之後`
            : `${value.timeTo} 之前`,
      jumpTo: () => openPill("filter-time"),
      remove: () =>
        navigate({ ...value, timeFrom: undefined, timeTo: undefined }),
    });
  }
  if (value.priceRange) {
    const range = PRICE_RANGES.find((r) => r.id === value.priceRange);
    if (range) {
      appliedTags.push({
        key: "price",
        label: range.label,
        jumpTo: () => openPill("filter-price"),
        remove: () => navigate({ ...value, priceRange: undefined }),
      });
    }
  }
  if (value.level) {
    appliedTags.push({
      key: "level",
      label: LEVEL_LABELS[value.level],
      jumpTo: () => openPill("filter-level"),
      remove: () => navigate({ ...value, level: undefined }),
    });
  }
  if (value.near) {
    appliedTags.push({
      key: "near",
      label: "📍 依距離排序",
      jumpTo: () => focusControl("#locate-button"),
      remove: () => navigate({ ...value, near: undefined }),
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
      {/* 運動種類是最高層級的搜尋條件：單選 Chips 放在其他篩選上面。
          桌面直接展開；手機單列橫向捲動，不縮小字級。用原生 radio，單選與方向鍵切換都不用自己寫 */}
      {/* fieldset 預設的最小寬度是內容寬度，不加 min-w-0 的話手機上整頁會被晶片列撐寬 */}
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium">運動種類</legend>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
          {[
            { value: "", label: "全部" },
            ...SPORT_CHIP_ORDER.map((sport) => ({ value: sport, label: sport })),
          ].map((chip) => (
            <Chip
              key={chip.value || "all"}
              type="radio"
              name="sport"
              value={chip.value}
              checked={(value.sport ?? "") === chip.value}
              onChange={() =>
                navigate({ ...value, sport: chip.value || undefined })
              }
            >
              {chip.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      {/* 第二排：膠囊下拉（地區、日期、星期、時段、程度、指定時段、價格區間），點開是面板 */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="篩選條件">
        <FilterPill
          id="filter-region"
          label="地區"
          active={Boolean(value.city)}
          wide
          onClear={() =>
            navigate({ ...value, city: undefined, district: undefined })
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="px-2 pb-1 text-xs font-semibold text-neutral-500">縣市</p>
              <PanelOption
                type="radio"
                name="region-city"
                checked={!value.city}
                onChange={() =>
                  navigate({ ...value, city: undefined, district: undefined })
                }
              >
                不限
              </PanelOption>
              {cities.map((city) => (
                <PanelOption
                  key={city}
                  type="radio"
                  name="region-city"
                  checked={value.city === city}
                  onChange={() =>
                    // 換縣市時行政區要清掉，否則會留著上一個縣市的行政區
                    navigate({ ...value, city, district: undefined })
                  }
                >
                  {city}
                </PanelOption>
              ))}
            </div>
            <div>
              <p className="px-2 pb-1 text-xs font-semibold text-neutral-500">行政區</p>
              {value.city ? (
                <>
                  <PanelOption
                    type="radio"
                    name="region-district"
                    checked={!value.district}
                    onChange={() => navigate({ ...value, district: undefined })}
                  >
                    不限
                  </PanelOption>
                  {(districtsByCity[value.city] ?? []).map((district) => (
                    <PanelOption
                      key={district}
                      type="radio"
                      name="region-district"
                      checked={value.district === district}
                      onChange={() => navigate({ ...value, district })}
                    >
                      {district}
                    </PanelOption>
                  ))}
                </>
              ) : (
                <p className="px-2 py-1.5 text-sm text-neutral-400">請先選縣市</p>
              )}
            </div>
          </div>
        </FilterPill>

        <FilterPill
          id="filter-date"
          label="日期"
          active={Boolean(value.date || value.dateTo)}
          onClear={() => navigate({ ...value, date: undefined, dateTo: undefined })}
        >
          <div className="space-y-2 text-sm">
            <label className="block font-medium">
              日期
              <input
                type="date"
                value={value.date ?? ""}
                onChange={(e) =>
                  navigate({ ...value, date: e.target.value || undefined })
                }
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-1.5 font-normal"
              />
            </label>
            <label className="block font-medium">
              到（選填，填了就是日期區間）
              <input
                type="date"
                value={value.dateTo ?? ""}
                onChange={(e) =>
                  navigate({ ...value, dateTo: e.target.value || undefined })
                }
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-1.5 font-normal"
              />
            </label>
            {isDateRangeInvalid(value) && (
              <p className="text-xs text-orange-600">
                結束日期要晚於開始日期，目前沒有套用日期。
              </p>
            )}
          </div>
        </FilterPill>

        <FilterPill
          id="filter-weekdays"
          label="星期"
          active={Boolean(value.weekdays?.length)}
          onClear={() => navigate({ ...value, weekdays: undefined })}
        >
          {WEEKDAYS.map((day) => (
            <PanelOption
              key={day}
              type="checkbox"
              name="weekday"
              checked={value.weekdays?.includes(day) ?? false}
              onChange={() =>
                navigate({ ...value, weekdays: toggle(value.weekdays, day) })
              }
            >
              星期{WEEKDAY_LABELS[day]}
            </PanelOption>
          ))}
        </FilterPill>

        {/* 時段有兩種方式，擇一使用：這裡的快速時段（可複選，OR），或「指定時段」的開始／結束時間 */}
        <FilterPill
          id="filter-slots"
          label="時段"
          active={Boolean(value.timeSlots?.length)}
          onClear={() => navigate({ ...value, timeSlots: undefined })}
        >
          {(Object.keys(TIME_SLOT_LABELS) as TimeSlot[]).map((slot) => (
            <PanelOption
              key={slot}
              type="checkbox"
              name="slot"
              checked={value.timeSlots?.includes(slot) ?? false}
              onChange={() =>
                navigate({
                  ...value,
                  timeSlots: toggle(value.timeSlots, slot),
                  timeFrom: undefined,
                  timeTo: undefined,
                })
              }
            >
              {TIME_SLOT_LABELS[slot]}
            </PanelOption>
          ))}
        </FilterPill>

        <FilterPill
          id="filter-level"
          label="程度"
          active={Boolean(value.level)}
          onClear={() => navigate({ ...value, level: undefined })}
        >
          <PanelOption
            type="radio"
            name="level"
            checked={!value.level}
            onChange={() => navigate({ ...value, level: undefined })}
          >
            不限
          </PanelOption>
          {FILTER_LEVELS.map((level) => (
            <PanelOption
              key={level}
              type="radio"
              name="level"
              checked={value.level === level}
              onChange={() => navigate({ ...value, level })}
            >
              {LEVEL_LABELS[level]}
            </PanelOption>
          ))}
        </FilterPill>

        <FilterPill
          id="filter-time"
          label="指定時段"
          active={Boolean(value.timeFrom || value.timeTo)}
          onClear={() =>
            navigate({ ...value, timeFrom: undefined, timeTo: undefined })
          }
        >
          <div className="space-y-2 text-sm">
            <label className="block font-medium">
              開始時間
              <select
                id="filter-time-from"
                value={value.timeFrom ?? ""}
                onChange={(e) =>
                  navigate({
                    ...value,
                    timeFrom: e.target.value || undefined,
                    timeSlots: undefined,
                  })
                }
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 font-normal"
              >
                <option value="">不限</option>
                {timeOptions(value.timeFrom).map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </label>
            <label className="block font-medium">
              結束時間
              <select
                id="filter-time-to"
                value={value.timeTo ?? ""}
                onChange={(e) =>
                  navigate({
                    ...value,
                    timeTo: e.target.value || undefined,
                    timeSlots: undefined,
                  })
                }
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 font-normal"
              >
                <option value="">不限</option>
                {timeOptions(value.timeTo).map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </label>
            {isTimeRangeInvalid(value) && (
              <p className="text-xs text-orange-600">
                結束時間要晚於開始時間，目前沒有套用指定時段。
              </p>
            )}
          </div>
        </FilterPill>

        <FilterPill
          id="filter-price"
          label="價格區間"
          active={Boolean(value.priceRange)}
          onClear={() => navigate({ ...value, priceRange: undefined })}
        >
          {PRICE_RANGES.map((range) => (
            <PanelOption
              key={range.id}
              type="radio"
              name="price"
              checked={value.priceRange === range.id}
              onChange={() => navigate({ ...value, priceRange: range.id })}
            >
              {range.label}
            </PanelOption>
          ))}
        </FilterPill>
      </div>

      {appliedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 text-sm">
          <span className="font-medium text-neutral-700">已套用條件</span>
          <ul className="flex flex-wrap gap-2">
            {appliedTags.map((tag) => (
              <li
                key={tag.key}
                className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 text-teal-800"
              >
                <button
                  type="button"
                  onClick={tag.jumpTo}
                  aria-label={`修改條件：${tag.label}`}
                  className="rounded-l-full py-1 pl-3 pr-1.5 hover:underline"
                >
                  {tag.label}
                </button>
                <button
                  type="button"
                  onClick={tag.remove}
                  aria-label={`移除條件：${tag.label}`}
                  className="rounded-r-full py-1 pl-1 pr-2.5 text-teal-600 hover:text-teal-900"
                >
                  <span aria-hidden="true">✕</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-3 text-sm">
        {value.near ? (
          <>
            <span className="font-medium text-teal-700">
              📍 已依距離由近到遠排序
            </span>
            <button
              type="button"
              onClick={() => navigate({ ...value, near: undefined })}
              className="text-neutral-500 underline hover:text-neutral-800"
            >
              取消定位
            </button>
          </>
        ) : (
          <button
            id="locate-button"
            type="button"
            onClick={() => requestLocation()}
            disabled={locationState === "loading"}
            className="rounded-full border border-teal-600 px-4 py-1.5 font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-wait disabled:opacity-60"
          >
            {locationState === "loading" ? "定位中…" : "📍 使用我的位置"}
          </button>
        )}

        {locationState === "denied" && (
          <span className="text-orange-600">
            {showFallbackNote
              ? `無法取得位置（已拒絕定位權限），先顯示「${DEFAULT_CITY}」的課程，可用上方「地區」改選。`
              : "無法取得位置：你已拒絕定位權限，可改用上方「地區」篩選。"}
            {/* 瀏覽器拒絕過一次就不會再跳出詢問，使用者得自己去設定開回來 */}
            <span className="mt-1 block text-xs text-orange-700">
              想使用定位：請到瀏覽器的網站設定（網址列左側的圖示）把「位置」改成允許，手機也要確認系統的「定位服務」是開著的，再按「使用我的位置」（必要時重新整理頁面）。
            </span>
          </span>
        )}
        {locationState === "error" && (
          <span className="text-orange-600">
            {showFallbackNote
              ? `暫時無法取得位置，先顯示「${DEFAULT_CITY}」的課程，可用上方「地區」改選。`
              : "暫時無法取得位置，請稍後再試，或改用上方「地區」篩選。"}
          </span>
        )}

        {/* 程度下拉沒有「不限」，所以有任何條件時都要能一次清掉 */}
        {hasActiveFilters(value) && (
          <button
            type="button"
            onClick={() => router.replace(pathname, { scroll: false })}
            className="ml-auto text-neutral-500 underline hover:text-neutral-800"
          >
            清除所有篩選
          </button>
        )}
      </div>
    </div>
  );
}
