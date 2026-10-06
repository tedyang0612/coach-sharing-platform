import type { Course } from "./types";
import { listCourseCards } from "./queries";

// 課程資料的唯一出口。一個場次一筆（PRD v4.6：一張卡＝一個場次）。
// 已取消、已開始的場次不列出（場次到了上課開始時間就從列表移除）。
export async function getCourses(now: Date = new Date()): Promise<Course[]> {
  return listCourseCards(now);
}
