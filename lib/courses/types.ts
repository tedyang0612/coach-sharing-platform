// 學員端課程列表專用型別。
// 刻意不放進 types/（Ted 維護）；等 Ted 的 schema 合併後，再對齊 types/database.ts 的 courses 欄位。

import { SPORT_TYPES, type CourseLevel } from "@/types/database";

export type TimeSlot = "morning" | "afternoon" | "evening";
// 值對應資料庫 courses.level（Ted 的 types/database.ts）；unlimited 顯示為「不限」。
// 顯示文案的常數 LEVEL_LABELS 先用自己的，等 Ted 的 PR #19（COURSE_LEVELS）進 main 再對齊。
export type Level = CourseLevel;

export interface Course {
  id: string;
  title: string;
  sport: string;
  city: string;
  district: string; // 行政區，依場次實際上課地址判斷（對應 courses.district）
  venue: string;
  startsAt: string; // ISO 8601
  level: Level;
  // 公開顯示的教練名稱：暱稱優先，沒填暱稱就用真實姓名。
  // 判斷在查詢層（getCourses）做，真實姓名不放進這個型別。
  coachName: string;
  price: number;
  enrolled: number;
  minToOpen: number; // 達到這個人數才開課
  capacity: number;
}

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "上午（06:00–11:59）",
  afternoon: "下午（12:00–17:59）",
  evening: "晚上（18:00–23:59）",
};

// 快速時段的範圍，單位是「當天的第幾分鐘」，頭尾都含（上午 0600–1159）
export const TIME_SLOT_RANGES: Record<TimeSlot, readonly [number, number]> = {
  morning: [6 * 60, 11 * 60 + 59],
  afternoon: [12 * 60, 17 * 60 + 59],
  evening: [18 * 60, 23 * 60 + 59],
};

// 星期篩選：1 = 星期一 … 7 = 星期日（ISO 8601）
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const WEEKDAY_LABELS: Record<number, string> = {
  1: "一",
  2: "二",
  3: "三",
  4: "四",
  5: "五",
  6: "六",
  7: "日",
};

export const LEVEL_LABELS: Record<Level, string> = {
  unlimited: "不限",
  beginner: "初階",
  intermediate: "中階",
  advanced: "進階",
};

// 篩選的程度選項與順序：不限、初階、中階、進階。「不限」也是一種篩選：選它只列程度為「不限」的課；
// 一個都沒選才是不篩選（面板的「清除」或「已套用條件」的 ✕ 可以取消）。
export const FILTER_LEVELS = [
  "unlimited",
  "beginner",
  "intermediate",
  "advanced",
] as const satisfies readonly Level[];

// 運動項目：直接用 Ted 的 SPORT_TYPES（types/database.ts），不另外維護清單。
export const SPORTS = SPORT_TYPES;

export type Sport = (typeof SPORT_TYPES)[number];

// 篩選 Chips 的排列順序（P02 規格；「全部」另外放在最前面，不屬於運動項目）
export const SPORT_CHIP_ORDER = [
  "重訓",
  "瑜珈",
  "羽球",
  "排球",
  "匹克球",
  "衝浪",
  "抱石",
  "跑酷",
] as const satisfies readonly Sport[];

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
