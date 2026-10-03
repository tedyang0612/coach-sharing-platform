// 學員端課程列表專用型別。
// 刻意不放進 types/（Ted 維護）；等 Ted 的 schema 合併後，再對齊 types/database.ts 的 courses 欄位。

export type TimeSlot = "morning" | "afternoon" | "evening";
// 值對應資料庫 courses.level；unlimited 代表不限程度
export type Level = "unlimited" | "beginner" | "intermediate" | "advanced";

export interface Course {
  id: string;
  title: string;
  sport: string;
  city: string;
  district: string; // 行政區，依場次實際上課地址判斷（對應 courses.district）
  venue: string;
  latitude: number | null; // 資料表允許為空，沒座標的課程排序時放最後
  longitude: number | null;
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
  unlimited: "全程度",
  beginner: "初階",
  intermediate: "中階",
  advanced: "進階",
};

// 篩選的程度選項與順序：不限（不篩選）、初階、中階、進階。
// 全程度的課任何人都能上，所以選初階／中階／進階時一律一併列出；不限也會列出，不需要單獨篩選它。
export const FILTER_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type FilterLevel = (typeof FILTER_LEVELS)[number];

// 運動項目：產品決定的固定清單。
// types/database.ts 的 SPORT_TYPES 目前還是舊清單，之後要請 Ted 對齊這份。
export const SPORTS = [
  "重訓",
  "瑜珈",
  "跑酷",
  "抱石",
  "衝浪",
  "羽球",
  "匹克球",
  "排球",
] as const;

export type Sport = (typeof SPORTS)[number];

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
