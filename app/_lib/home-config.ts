// 首頁（PRD 14.0）用到的固定設定。

/** 運動種類入口：固定順序（重訓、瑜珈、羽球、排球、匹克球、衝浪、抱石、跑酷） */
export const HOME_SPORTS = [
  { name: "重訓", image: "/images/sports/weight-training.png" },
  { name: "瑜珈", image: "/images/sports/yoga.png" },
  { name: "羽球", image: "/images/sports/badminton.png" },
  { name: "排球", image: "/images/sports/volleyball.png" },
  { name: "匹克球", image: "/images/sports/pickleball.png" },
  { name: "衝浪", image: "/images/sports/surfing.png" },
  { name: "抱石", image: "/images/sports/bouldering.png" },
  { name: "跑酷", image: "/images/sports/parkour.png" },
] as const;

// 課程列表（S04／2.0，小柔負責）的網址參數，對齊 lib/courses/filterCourses.ts 的 parse／serialize：
//   sport    運動種類名稱（例：羽球）
//   city     縣市；district 行政區名稱（需搭配 city）
//   days     星期，逗號分隔，1＝星期一 … 7＝星期日
//   slot     morning／afternoon／evening（上午／下午／晚上，台灣時間），逗號分隔
export const COURSE_LIST_PATH = "/courses";

export type CourseListFilter = {
  sport?: string;
  city?: string;
  district?: string;
  days?: number[];
  slot?: "morning" | "afternoon" | "evening";
};

export const WEEKEND = [6, 7];
export const WEEKDAYS = [1, 2, 3, 4, 5];

export function courseListHref(filter: CourseListFilter = {}): string {
  const params = new URLSearchParams();
  if (filter.city) params.set("city", filter.city);
  if (filter.city && filter.district) params.set("district", filter.district);
  if (filter.days?.length) params.set("days", filter.days.join(","));
  if (filter.slot) params.set("slot", filter.slot);
  if (filter.sport) params.set("sport", filter.sport);
  const query = params.toString();
  return query ? `${COURSE_LIST_PATH}?${query}` : COURSE_LIST_PATH;
}

/** 熱門條件：MVP 為平台預先設定的固定清單（PRD 14.0 規格 3） */
export const POPULAR_CONDITIONS: { label: string; filter: CourseListFilter }[] = [
  { label: "羽球", filter: { sport: "羽球" } },
  { label: "板橋", filter: { city: "新北市", district: "板橋區" } },
  { label: "週末", filter: { days: WEEKEND } },
  { label: "板橋羽球", filter: { sport: "羽球", city: "新北市", district: "板橋區" } },
  { label: "平日晚間瑜珈", filter: { sport: "瑜珈", days: WEEKDAYS, slot: "evening" } },
];
