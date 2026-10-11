"use client";

import { useState } from "react";
import CourseCard from "@/components/CourseCard";
import { buttonClassName } from "@/components/ui/button";
import type { Course } from "@/lib/courses/types";

// 先顯示最近的幾個場次，其餘按「顯示更多」再展開，避免場次很多時把頁面拉得很長
const PAGE_SIZE = 3;

/** 教練公開頁「招生中的課程」：一張卡一個場次，卡片用學員端課程列表的 CourseCard（2.0，小柔）。 */
export function CoachCourseList({ courses }: { courses: Course[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const remaining = courses.length - visible;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {courses.slice(0, visible).map((course) => (
          <li key={course.id}>
            <CourseCard course={course} />
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisible((count) => count + PAGE_SIZE * 2)}
          className={buttonClassName("secondary", true)}
        >
          顯示更多（還有 {remaining} 個場次）
        </button>
      )}
    </div>
  );
}
