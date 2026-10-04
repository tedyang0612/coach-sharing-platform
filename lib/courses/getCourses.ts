import type { Course } from "./types";
import { MOCK_COURSES } from "./mockCourses";
import { buildMockSessions } from "./getCourseDetail";

// 課程資料的唯一出口。一個場次一筆（PRD v4.6：一張卡＝一個場次）。
// 已取消、已開始的場次不列出（場次到了上課開始時間就從列表移除）。
// TODO: Ted 的 courses／sessions 資料表合併後，改成用 lib/supabase/server.ts 查詢 sessions
// （join courses、districts），並把欄位轉成 Course 型別；頁面和元件都不用動。
export async function getCourses(now: Date = new Date()): Promise<Course[]> {
  return MOCK_COURSES.flatMap((base) =>
    buildMockSessions(base)
      .filter((s) => s.status === "open" && new Date(s.startsAt) > now)
      .map((s) => ({
        ...base,
        id: s.id,
        courseId: base.id,
        startsAt: s.startsAt,
        enrolled: s.enrolled,
      })),
  );
}
