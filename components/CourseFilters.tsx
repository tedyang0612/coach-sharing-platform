"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DEFAULT_CITY,
  hasActiveFilters,
  type CourseFilters as Filters,
} from "@/lib/courses/filterCourses";
import { LEVEL_LABELS, TIME_SLOT_LABELS } from "@/lib/courses/types";

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
      <div className="grid gap-4 sm:grid-cols-3">
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
            <option value="">不限</option>
            {Object.entries(LEVEL_LABELS).map(([level, label]) => (
              <option key={level} value={level}>
                {label}
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
          </span>
        )}
        {locationState === "error" && (
          <span className="text-orange-600">
            {showFallbackNote
              ? `暫時無法取得位置，先顯示「${DEFAULT_CITY}」的課程，可用上方「地點」改選。`
              : "暫時無法取得位置，請稍後再試，或改用上方「地點」篩選。"}
          </span>
        )}
      </div>
    </div>
  );
}
