import type { Course } from "./types";

// ---- 排序方式（網址參數 ?sort=） ----

export type SortMode = "time" | "recommended" | "price";

// 預設排序：PRD 與 Wireframe 的規定不同、團隊尚未定案，暫時維持「依開課時間」。
// 定案後只要改這一行就能切換。
export const DEFAULT_SORT: SortMode = "time";

export const SORT_LABELS: Record<SortMode, string> = {
  time: "依開課時間",
  recommended: "推薦排序",
  price: "價格低到高",
};

export function parseSort(value: string | string[] | undefined): SortMode {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "time" || raw === "recommended" || raw === "price"
    ? raw
    : DEFAULT_SORT;
}

// ---- 排序用的純函式（不碰畫面、不碰網址，方便驗證） ----

const startTime = (course: Course) => new Date(course.startsAt).getTime();

// 開課時間由近到遠；一樣就用課程 id，確保每次結果順序都相同
function byStartThenId(a: Course, b: Course) {
  return startTime(a) - startTime(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

// 差距 = 最低開課人數 − 已報名人數，最小為 0
export function gapOf(course: Course) {
  return Math.max(course.minToOpen - course.enrolled, 0);
}

// 可報名：目前只看是否額滿；之後接真資料時再加上「招生中、未截止、未取消」
export function isJoinable(course: Course) {
  return course.enrolled < course.capacity;
}

export function sortByStartTime(courses: Course[]): Course[] {
  return [...courses].sort(byStartThenId);
}

// 價格由低到高；同價就開課時間近的在前，再用 id 固定順序
export function sortByPrice(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => a.price - b.price || byStartThenId(a, b));
}

// 推薦排序（目標是提升開課成功率）。分三組，依序排列：
//   1. 未達最低開課人數：全部排在已達開課人數之前。差距少的在前 → 開課時間近的在前
//   2. 已達最低開課人數、仍可報名：開課時間近的在前
//   3. 不可報名（額滿）：開課時間近的在前，排在最後
// 條件都相同時用課程 id 排序，確保每次順序一致。
export function sortRecommended(courses: Course[]): Course[] {
  const group = (course: Course) =>
    !isJoinable(course) ? 2 : gapOf(course) > 0 ? 0 : 1;
  return [...courses].sort((a, b) => {
    const byGroup = group(a) - group(b);
    if (byGroup !== 0) return byGroup;
    if (group(a) === 0) {
      const gap = gapOf(a) - gapOf(b);
      if (gap !== 0) return gap;
    }
    return byStartThenId(a, b);
  });
}

// 入口：依排序方式排好（不修改傳入的陣列）
export function sortCourses(courses: Course[], mode: SortMode): Course[] {
  if (mode === "recommended") return sortRecommended(courses);
  if (mode === "price") return sortByPrice(courses);
  return sortByStartTime(courses);
}
