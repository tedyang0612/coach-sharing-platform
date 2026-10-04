import { getCourseWithSessions } from "./queries";

export type { CourseDetail, CourseSession } from "./queries";

// 詳情頁資料的唯一出口；找不到課程（或沒公開）回 null，頁面會顯示 404。
export async function getCourseDetail(id: string) {
  return getCourseWithSessions(id);
}
