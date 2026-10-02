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

// 運動項目：產品決定的固定清單。
// types/database.ts 的 SPORT_TYPES 目前還是舊清單，之後要請 Ted 對齊這份。
export const SPORTS = [
  "重訓",
  "瑜珈",
  "跑酷",
  "攀岩",
  "衝浪",
  "羽球",
  "匹克球",
  "排球",
] as const;

export type Sport = (typeof SPORTS)[number];

// 每人費用區間（NT$）。min / max 都是含邊界；沒寫代表沒有下限／上限。
export interface PriceRange {
  id: string;
  label: string;
  min?: number;
  max?: number;
}

export const PRICE_RANGES: PriceRange[] = [
  { id: "under-500", label: "NT$ 500 以下", max: 500 },
  { id: "501-800", label: "NT$ 501–800", min: 501, max: 800 },
  { id: "over-800", label: "NT$ 801 以上", min: 801 },
];
