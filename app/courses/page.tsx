import Link from "next/link";
import CourseCard from "@/components/CourseCard";
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
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold">搜尋與篩選課程</h1>
      <p className="mt-1 text-sm text-neutral-500">
        根據你的時間、地點與運動程度找到適合的課程
      </p>

      <div className="mt-6">
        <CourseFilters
          cities={cities}
          districtsByCity={districtsByCity}
          value={filters}
          sort={sort}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">共找到 {courses.length} 個課程</p>
        <SortSelect filters={filters} sort={sort} />
      </div>
      {courses.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-neutral-300 px-4 py-16 text-center">
          <p className="text-lg font-medium">
            附近目前暫無符合課程，試試擴大搜尋範圍或切換時段
          </p>
          <Link
            href="/courses"
            className="rounded-full bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            清除所有篩選
          </Link>
        </div>
      ) : (
        <div className="mt-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </main>
  );
}
