// 學員端課程列表專用型別。
// 刻意不放進 types/（Ted 維護）；等 Ted 的 schema 合併後，再對齊 types/database.ts 的 courses 欄位。

import { SPORT_TYPES, type CourseLevel } from "@/types/database";

export type TimeSlot = "morning" | "afternoon" | "evening";
// 值對應資料庫 courses.level（Ted 的 types/database.ts）；unlimited 顯示為「不限」。
// 顯示文案的常數 LEVEL_LABELS 先用自己的，等 Ted 的 PR #19（COURSE_LEVELS）進 main 再對齊。
export type Level = CourseLevel;

// 列表的一張卡 = 一個場次（PRD v4.6）：同一堂課有多個場次就會有多張卡。
// 場次專屬的欄位是 id、startsAt、enrolled；其餘是課程本身的資料。
export interface Course {
  id: string; // 場次 id（sessions.id）
  courseId: string; // 課程 id（courses.id），詳情頁路徑用這個
  title: string;
  sport: string;
  city: string;
  district: string; // 行政區，依場次實際上課地址判斷（對應 courses.district）
  venue: string;
  startsAt: string; // 場次開始時間，ISO 8601
  endsAt: string; // 場次結束時間，卡片顯示時間區間用
  level: Level;
  // 對應 courses.coach_id（= coach_profiles.id），教練名稱連到 /coaches/{coachId}
  coachId: string;
  // 公開顯示的教練名稱：對應 coach_profiles.display_name（有填暱稱是暱稱，沒填是真實姓名）。
  // 不要用 profiles.display_name（那是帳號暱稱）；真實姓名不放進這個型別。
  coachName: string;
  // 以下對應 Ted 公開的 coach_profiles 欄位（is_verified / tags / 評價）；
  // 查詢要明確列出欄位，不能用 select("*")
  coachVerified: boolean;
  coachTags: string[];
  // 對應 coach_profiles.avg_rating（資料庫已四捨五入到小數一位，沒有評價時為 null）與 review_count
  coachRating: number | null;
  coachReviewCount: number;
  price: number;
  enrolled: number; // 該場次的報名人數
  minToOpen: number; // 達到這個人數才開課
  capacity: number;
}

// 教練填寫的課程 Q&A（一題一答）。資料庫欄位還沒確定（等 Ted 確認存在哪裡），先定好畫面用的形狀
export interface CourseQaItem {
  question: string;
  answer: string;
}

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
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

// 篩選的程度選項與順序：不限、初階、中階、進階。「不限」也是一種篩選：選它只列程度為「不限」的課；選初階／中階／進階時，「不限」的課也一併列出；
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
