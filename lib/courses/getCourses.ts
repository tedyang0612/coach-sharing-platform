import type { Course } from "./types";
import { MOCK_COURSES } from "./mockCourses";

// 課程資料的唯一出口。
// TODO: Ted 的 courses 資料表合併後，改成用 lib/supabase/server.ts 查詢，
// 並把 Supabase 的欄位轉成 Course 型別；頁面和元件都不用動。
export async function getCourses(): Promise<Course[]> {
  return MOCK_COURSES;
}
