// 課程連結的狀態（10.0 規格 4）：
// 已取消、已結束、已額滿時連結仍可開啟，但要顯示狀態並隱藏報名按鈕。

export type CourseAvailability = "open" | "full" | "ended" | "cancelled";

// 只列判斷需要的欄位，對應 courses 資料表，不綁定 types/ 的完整型別。
export interface AvailabilityCourse {
  status: "draft" | "published" | "cancelled" | "completed";
  end_time: string; // ISO 8601
  max_participants: number;
}

// 優先順序：已取消 > 已結束 > 已額滿 > 招生中。
// registeredCount 由呼叫端決定要算哪些報名狀態（例如 confirmed）；
// 未登入者目前讀不到 registrations，需等 Ted 提供公開的報名人數來源。
// draft 不會公開給非教練本人（RLS 只開放 published），這裡不特別處理。
export function getCourseAvailability(
  course: AvailabilityCourse,
  registeredCount: number,
  now: Date = new Date(),
): CourseAvailability {
  if (course.status === "cancelled") return "cancelled";
  if (course.status === "completed" || new Date(course.end_time) <= now) {
    return "ended";
  }
  if (registeredCount >= course.max_participants) return "full";
  return "open";
}

export function canRegister(availability: CourseAvailability) {
  return availability === "open";
}
