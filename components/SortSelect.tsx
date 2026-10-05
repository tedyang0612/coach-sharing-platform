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
    <label className="flex items-center gap-2 text-sm font-medium text-(--color-text-primary)">
      排序
      <select
        value={sort}
        onChange={(e) => changeSort(e.target.value as SortMode)}
        className="rounded-full border border-(--color-border-default) bg-(--color-surface-default) px-4 py-1.5 text-sm font-normal"
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
