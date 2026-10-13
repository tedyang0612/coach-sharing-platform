"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  filtersToQuery,
  type CourseFilters as Filters,
} from "@/lib/courses/filterCourses";
import { SORT_LABELS, type SortMode } from "@/lib/courses/sort";

// 排序選單：只改網址的 ?sort=，其他篩選條件原樣保留，所以只改順序、不改結果數量
export default function SortSelect({
  filters,
  sort,
}: {
  filters: Filters;
  sort: SortMode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function changeSort(next: SortMode) {
    const query = filtersToQuery(filters, next);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    // 設計稿 S04（第六頁）：排序只是「推薦排序 ▾」純文字，沒有外框；「排序」二字留給螢幕報讀器
    <label className="flex items-center text-sm font-medium text-(--color-text-secondary)">
      <span className="sr-only">排序</span>
      <select
        value={sort}
        onChange={(e) => changeSort(e.target.value as SortMode)}
        className="cursor-pointer rounded-full bg-transparent py-1.5 pl-3 pr-1 text-sm font-normal text-(--color-text-secondary) hover:text-(--color-text-primary)"
      >
        {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
          <option key={mode} value={mode}>
            {SORT_LABELS[mode]}
          </option>
        ))}
      </select>
    </label>
  );
}
