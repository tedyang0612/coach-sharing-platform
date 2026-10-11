"use client";

import { useEffect, useState } from "react";
import CourseCard from "@/components/CourseCard";
import ScrollToTop from "@/components/ScrollToTop";
import { LIST_HREF_KEY } from "@/lib/courses/listHref";
import type { Course } from "@/lib/courses/types";

// 12 剛好整除 4、3、2 欄，每一排都排滿
const PAGE_SIZE = 12;

// 載入更多（非分頁）：網址不變，按一次多顯示 12 張。
// 篩選或排序改變時整頁會重新渲染，用 key 讓這裡回到第一批。
export default function CourseGrid({ courses }: { courses: Course[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  // 記下目前的列表網址（含篩選與排序），詳情頁的「返回搜尋結果」才回得到同一個條件；
  // 篩選改變時整頁用 key 重新渲染，這裡會重新跑一次
  useEffect(() => {
    try {
      window.sessionStorage.setItem(LIST_HREF_KEY, `${window.location.pathname}${window.location.search}`);
    } catch {
      // 無痕模式或被擋時不記，回上一頁會是沒有條件的列表
    }
  }, []);

  return (
    <>
      <div className="mt-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {courses.slice(0, visible).map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
      {visible < courses.length && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((n) => n + PAGE_SIZE)}
            className="rounded-full border border-(--color-brand-blue) bg-(--color-surface-default) px-8 py-2.5 text-sm font-bold text-(--color-text-primary) hover:bg-(--color-tint-blue-100)"
          >
            載入更多課程
          </button>
        </div>
      )}
      <ScrollToTop />
    </>
  );
}
