// 學員端課程列表專用型別。
// 刻意不放進 types/（Ted 維護）；等 Ted 的 schema 合併後，再對齊 types/database.ts 的 courses 欄位。

export type TimeSlot = "morning" | "afternoon" | "evening";
// 值對應資料庫 courses.level；unlimited 顯示為「不限」
export type Level = "unlimited" | "beginner" | "intermediate" | "advanced";

export interface Course {
  id: string;
  title: string;
  sport: string;
  city: string;
  district: string; // 行政區，依場次實際上課地址判斷（對應 courses.district）
  venue: string;
  startsAt: string; // ISO 8601
  level: Level;
  // 對應 courses.coach_id（= coach_profiles.id），教練名稱連到 /coaches/{coachId}
  coachId: string;
  // 公開顯示的教練名稱：對應 coach_profiles.display_name（有填暱稱是暱稱，沒填是真實姓名）。
  // 不要用 profiles.display_name（那是帳號暱稱）；真實姓名不放進這個型別。
  coachName: string;
  // 以下對應 Ted 公開的 coach_profiles 欄位（photo_url / is_verified / tags）；
  // 查詢要明確列出欄位，不能用 select("*")
  coachPhotoUrl: string | null;
  coachVerified: boolean;
  coachTags: string[];
  // 對應 coach_profiles.avg_rating（資料庫已四捨五入到小數一位，沒有評價時為 null）與 review_count
  coachRating: number | null;
  coachReviewCount: number;
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
