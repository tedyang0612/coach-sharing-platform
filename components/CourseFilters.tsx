"use client";

import { usePathname, useRouter } from "next/navigation";
import type { CourseFilters as Filters } from "@/lib/courses/filterCourses";
import { LEVEL_LABELS, TIME_SLOT_LABELS } from "@/lib/courses/types";

interface Props {
  cities: string[];
  value: Filters;
}

const SELECT_CLASS =
  "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm";

export default function CourseFilters({ cities, value }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // 篩選條件放在網址上，結果可以分享連結，重新整理也不會消失。
  function update(key: "city" | "slot" | "level", next: string) {
    const params = new URLSearchParams();
    const current = {
      city: value.city,
      slot: value.timeSlot,
      level: value.level,
    };
    for (const [k, v] of Object.entries({ ...current, [key]: next })) {
      if (v) params.set(k, v);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:grid-cols-3">
      <label className="text-sm font-medium">
        地點
        <select
          className={`${SELECT_CLASS} mt-1 font-normal`}
          value={value.city ?? ""}
          onChange={(e) => update("city", e.target.value)}
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
          onChange={(e) => update("slot", e.target.value)}
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
          onChange={(e) => update("level", e.target.value)}
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
  );
}
