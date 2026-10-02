// 學員端課程列表專用型別。
// 刻意不放進 types/（Ted 維護）；等 Ted 的 schema 合併後，再對齊 types/database.ts 的 courses 欄位。

export type TimeSlot = "morning" | "afternoon" | "evening";
export type Level = "beginner" | "intermediate" | "advanced";

export interface Course {
  id: string;
  title: string;
  sport: string;
  city: string;
  venue: string;
  latitude: number | null; // 資料表允許為空，沒座標的課程排序時放最後
  longitude: number | null;
  startsAt: string; // ISO 8601
  timeSlot: TimeSlot;
  level: Level;
  coachName: string;
  price: number;
  enrolled: number;
  minToOpen: number; // 達到這個人數才成團
  capacity: number;
}

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "早上（06–12）",
  afternoon: "下午（12–18）",
  evening: "晚上（18–22）",
};

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: "初級 / 新手友善",
  intermediate: "中級",
  advanced: "進階",
};
