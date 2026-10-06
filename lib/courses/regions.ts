import type { District } from "@/types/database";
import type { Course } from "./types";

// 縣市與行政區的選項。資料來源是資料庫的 districts 表（Ted 的 PR #18：22 縣市、368 個鄉鎮市區，
// 縣市與行政區名一律用「台」），前端不另外維護一份清單。
export type DistrictRow = Pick<District, "towncode" | "city" | "district">;

export interface RegionOptions {
  cities: string[];
  districtsByCity: Record<string, string[]>;
}

// 縣市在選單裡的顯示順序（只決定「先後」，名稱本身仍以資料庫為準；不在這份裡的縣市排在後面，
// 依資料庫的 towncode 排序）。依一般習慣把六都放前面。
const CITY_DISPLAY_ORDER = [
  "台北市",
  "新北市",
  "桃園市",
  "台中市",
  "台南市",
  "高雄市",
  "基隆市",
  "新竹市",
  "新竹縣",
  "苗栗縣",
  "彰化縣",
  "南投縣",
  "雲林縣",
  "嘉義市",
  "嘉義縣",
  "屏東縣",
  "宜蘭縣",
  "花蓮縣",
  "台東縣",
  "澎湖縣",
  "金門縣",
  "連江縣",
];

// 從 districts 表的資料整理出選項：行政區依 towncode 排序，縣市依上面的顯示順序
export function buildRegionOptions(rows: DistrictRow[]): RegionOptions {
  const sorted = [...rows].sort((a, b) => a.towncode.localeCompare(b.towncode));
  const districtsByCity: Record<string, string[]> = {};
  for (const row of sorted) {
    const list = (districtsByCity[row.city] ??= []);
    if (!list.includes(row.district)) list.push(row.district);
  }
  const rank = (city: string) => {
    const index = CITY_DISPLAY_ORDER.indexOf(city);
    return index === -1 ? CITY_DISPLAY_ORDER.length : index;
  };
  const cities = Object.keys(districtsByCity).sort(
    (a, b) => rank(a) - rank(b), // 同順位時維持 towncode 的先後（排序是穩定的）
  );
  return { cities, districtsByCity };
}

// 資料庫讀不到時的備用：從課程資料推導（只會出現有課程的縣市與行政區）
export function deriveRegionOptions(courses: Course[]): RegionOptions {
  const districtsByCity: Record<string, string[]> = {};
  for (const course of courses) {
    const list = (districtsByCity[course.city] ??= []);
    if (!list.includes(course.district)) list.push(course.district);
  }
  return { cities: Object.keys(districtsByCity), districtsByCity };
}
