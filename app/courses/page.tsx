import Link from "next/link";
import CourseGrid from "@/components/CourseGrid";
import GolandTheme from "@/components/goland/GolandTheme";
import CourseFilters from "@/components/CourseFilters";
import SortSelect from "@/components/SortSelect";
import { filterCourses, parseFilters } from "@/lib/courses/filterCourses";
import { getCourses } from "@/lib/courses/getCourses";
import { getDistricts } from "@/lib/courses/getDistricts";
import { buildRegionOptions, deriveRegionOptions } from "@/lib/courses/regions";
import { parseSort, sortCourses } from "@/lib/courses/sort";

export const metadata = {
  title: "找課程｜教練共課平台",
};

// 未登入也能瀏覽：這頁不做任何登入檢查。
export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const allCourses = await getCourses();
  const params = await searchParams;
  const parsed = parseFilters(params);
  const sort = parseSort(params.sort);
  // 縣市與行政區選項讀資料庫的 districts 表（Ted 的 PR #18）；讀不到時退回從課程資料推導
  const districts = await getDistricts();
  const { cities, districtsByCity } = districts
    ? buildRegionOptions(districts)
    : deriveRegionOptions(allCourses);
  // 網址帶的行政區不屬於所選縣市時當成不限，和其他不合法的值一樣不讓頁面壞掉
  const filters =
    parsed.city && parsed.district &&
    !districtsByCity[parsed.city]?.includes(parsed.district)
      ? { ...parsed, district: undefined }
      : parsed;
  // 先篩選，再依排序方式排（預設值見 lib/courses/sort.ts 的 DEFAULT_SORT）
  const courses = sortCourses(filterCourses(allCourses, filters), sort);

  return (
    <GolandTheme active="explore">
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
      <h1 className="text-h1">課程搜尋結果</h1>

      <div className="mt-6">
        <CourseFilters
          cities={cities}
          districtsByCity={districtsByCity}
          value={filters}
          sort={sort}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-(--color-text-secondary)">共 {courses.length} 堂課程</p>
        <SortSelect filters={filters} sort={sort} />
      </div>
      {courses.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-4 rounded-(--radius-lg) border border-dashed border-(--color-border-default) px-4 py-16 text-center">
          <p className="text-lg font-medium">
            目前沒有符合條件的課程，試試其他日期或地區
          </p>
          <Link
            href="/courses"
            className="rounded-full bg-(--color-brand-blue) px-5 py-2 text-sm font-bold text-(--color-text-inverse) hover:bg-(--color-brand-blue-pressed)"
          >
            清除所有篩選
          </Link>
        </div>
      ) : (
        // 篩選或排序改變就換 key，「載入更多」回到第一批
        <CourseGrid key={JSON.stringify(params)} courses={courses} />
      )}
    </main>
    </GolandTheme>
  );
}
