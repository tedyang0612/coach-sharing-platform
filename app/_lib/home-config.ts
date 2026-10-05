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

// 課程列表（S04／2.0）的網址參數約定。列表頁尚未實作，這裡先定義，列表頁照這份讀取：
//   sport    運動種類名稱（例：羽球）
//   district 行政區 id（districts.id）
//   days     weekend（週六日）／weekday（週一到五）
//   slot     morning／afternoon／evening（上午／下午／晚上，台灣時間）
export const COURSE_LIST_PATH = "/courses";

export type CourseListFilter = {
  sport?: string;
  district?: number | null;
  days?: "weekend" | "weekday";
  slot?: "morning" | "afternoon" | "evening";
};

export function courseListHref(filter: CourseListFilter = {}): string {
  const params = new URLSearchParams();
  if (filter.sport) params.set("sport", filter.sport);
  if (filter.district) params.set("district", String(filter.district));
  if (filter.days) params.set("days", filter.days);
  if (filter.slot) params.set("slot", filter.slot);
  const query = params.toString();
  return query ? `${COURSE_LIST_PATH}?${query}` : COURSE_LIST_PATH;
}

/** 熱門條件：MVP 為平台預先設定的固定清單（PRD 14.0 規格 3） */
export const POPULAR_CONDITIONS: {
  label: string;
  filter: { sport?: string; city?: string; district?: string; days?: "weekend" | "weekday"; slot?: "evening" };
}[] = [
  { label: "羽球", filter: { sport: "羽球" } },
  { label: "板橋", filter: { city: "新北市", district: "板橋區" } },
  { label: "週末", filter: { days: "weekend" } },
  { label: "板橋羽球", filter: { sport: "羽球", city: "新北市", district: "板橋區" } },
  { label: "平日晚間瑜珈", filter: { sport: "瑜珈", days: "weekday", slot: "evening" } },
];
