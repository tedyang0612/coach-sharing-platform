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
  venue: string;
  latitude: number | null; // 資料表允許為空，沒座標的課程排序時放最後
  longitude: number | null;
  startsAt: string; // ISO 8601
  timeSlot: TimeSlot;
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
  minToOpen: number; // 達到這個人數才成團
  capacity: number;
}

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "早上（06–12）",
  afternoon: "下午（12–18）",
  evening: "晚上（18–22）",
};

export const LEVEL_LABELS: Record<Level, string> = {
  unlimited: "全程度",
  beginner: "初級",
  intermediate: "中級",
  advanced: "進階",
};

// 篩選下拉的程度選項與順序（初級／中級／進階／全程度）。
// 選初級／中級／進階時，全程度的課任何人都能上，會一併列出；選全程度只列全程度的課。
export const FILTER_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
  "unlimited",
] as const;
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
