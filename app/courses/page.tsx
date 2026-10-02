import Link from "next/link";
import CourseCard from "@/components/CourseCard";
import CourseFilters from "@/components/CourseFilters";
import { sortByDistance } from "@/lib/courses/distance";
import { filterCourses, parseFilters } from "@/lib/courses/filterCourses";
import { getCourses } from "@/lib/courses/getCourses";
import { sortByStartTime } from "@/lib/courses/sortCourses";

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
  const filters = parseFilters(await searchParams);
  // 基本排序固定依開課時間由近到遠；有定位時再依距離排序，
  // 距離相同或沒有座標的課程維持開課時間的順序（排序是穩定的）。
  const filtered = sortByStartTime(filterCourses(allCourses, filters));
  const courses = filters.near
    ? sortByDistance(filtered, filters.near)
    : filtered.map((course) => ({ course, distanceKm: null }));
  // 城市選項從資料推導，之後換成真資料不用另外維護清單
  const cities = [...new Set(allCourses.map((course) => course.city))];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold">搜尋與篩選課程</h1>
      <p className="mt-1 text-sm text-neutral-500">
        根據你的時間、地點與運動程度找到適合的課程
      </p>

      <div className="mt-6">
        <CourseFilters cities={cities} value={filters} />
      </div>

      <p className="mt-8 text-sm text-neutral-500">
        共找到 {courses.length} 個課程
      </p>
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
          {courses.map(({ course, distanceKm }) => (
            <CourseCard key={course.id} course={course} distanceKm={distanceKm} />
          ))}
        </div>
      )}
    </main>
  );
}
