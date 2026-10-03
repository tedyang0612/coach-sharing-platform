"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DEFAULT_CITY,
  hasActiveFilters,
  type CourseFilters as Filters,
} from "@/lib/courses/filterCourses";
import {
  FILTER_LEVELS,
  LEVEL_LABELS,
  PRICE_RANGES,
  SPORT_CHIP_ORDER,
  TIME_SLOT_LABELS,
} from "@/lib/courses/types";

interface Props {
  cities: string[];
  value: Filters;
}

type LocationState = "idle" | "loading" | "denied" | "error";

const SELECT_CLASS =
  "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm";

export default function CourseFilters({ cities, value }: Props) {
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
    if (next.timeSlot) params.set("slot", next.timeSlot);
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

  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
      {/* 運動種類是最高層級的搜尋條件：單選 Chips 放在其他篩選上面。
          桌面直接展開；手機單列橫向捲動，不縮小字級。用原生 radio，單選與方向鍵切換都不用自己寫 */}
      {/* fieldset 預設的最小寬度是內容寬度，不加 min-w-0 的話手機上整頁會被晶片列撐寬 */}
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium">運動種類</legend>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
          {[{ value: "", label: "全部" }, ...SPORT_CHIP_ORDER.map((sport) => ({ value: sport, label: sport }))].map(
            (chip) => (
              <label key={chip.value || "all"} className="relative shrink-0 cursor-pointer">
                <input
                  type="radio"
                  name="sport"
                  value={chip.value}
                  checked={(value.sport ?? "") === chip.value}
                  onChange={() =>
                    navigate({ ...value, sport: chip.value || undefined })
                  }
                  className="peer sr-only"
                />
                <span className="block whitespace-nowrap rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 transition peer-checked:border-teal-600 peer-checked:bg-teal-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-teal-600 peer-focus-visible:ring-offset-2 hover:border-teal-400">
                  {chip.label}
                </span>
              </label>
            ),
          )}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium">
          地點
          <select
            className={`${SELECT_CLASS} mt-1 font-normal`}
            value={value.city ?? ""}
            onChange={(e) =>
              navigate({ ...value, city: e.target.value || undefined })
            }
          >
            <option value="">不限</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          每人費用
          <select
            className={`${SELECT_CLASS} mt-1 font-normal`}
            value={value.priceRange ?? ""}
            onChange={(e) =>
              navigate({ ...value, priceRange: e.target.value || undefined })
            }
          >
            <option value="">不限</option>
            {PRICE_RANGES.map((range) => (
              <option key={range.id} value={range.id}>
                {range.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          時段
          <select
            className={`${SELECT_CLASS} mt-1 font-normal`}
            value={value.timeSlot ?? ""}
            onChange={(e) =>
              navigate({
                ...value,
                timeSlot: (e.target.value || undefined) as Filters["timeSlot"],
              })
            }
          >
            <option value="">不限</option>
            {Object.entries(TIME_SLOT_LABELS).map(([slot, label]) => (
              <option key={slot} value={slot}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          運動程度
          <select
            className={`${SELECT_CLASS} mt-1 font-normal`}
            value={value.level ?? ""}
            onChange={(e) =>
              navigate({
                ...value,
                level: (e.target.value || undefined) as Filters["level"],
              })
            }
          >
            {/* 程度只有四個選項，沒有「不限」；還沒選時顯示提示文字，清除請用下方「清除所有篩選」 */}
            <option value="" disabled hidden>
              請選擇程度
            </option>
            {FILTER_LEVELS.map((level) => (
              <option key={level} value={level}>
                {LEVEL_LABELS[level]}
              </option>
            ))}
          </select>
        </label>
      </div>

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
              ? `無法取得位置（已拒絕定位權限），先顯示「${DEFAULT_CITY}」的課程，可用上方「地點」改選。`
              : "無法取得位置：你已拒絕定位權限，可改用上方「地點」篩選。"}
            {/* 瀏覽器拒絕過一次就不會再跳出詢問，使用者得自己去設定開回來 */}
            <span className="mt-1 block text-xs text-orange-700">
              想使用定位：請到瀏覽器的網站設定（網址列左側的圖示）把「位置」改成允許，手機也要確認系統的「定位服務」是開著的，再按「使用我的位置」（必要時重新整理頁面）。
            </span>
          </span>
        )}
        {locationState === "error" && (
          <span className="text-orange-600">
            {showFallbackNote
              ? `暫時無法取得位置，先顯示「${DEFAULT_CITY}」的課程，可用上方「地點」改選。`
              : "暫時無法取得位置，請稍後再試，或改用上方「地點」篩選。"}
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
