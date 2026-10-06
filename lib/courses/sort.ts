import type { Course } from "./types";

// ---- 排序方式（網址參數 ?sort=） ----

export type SortMode = "time" | "recommended" | "price";

// 預設排序：設計稿 S04 與驗收清單都以「推薦排序」為預設。
// 若團隊改決定，只要改這一行就能切換。
export const DEFAULT_SORT: SortMode = "recommended";

// 選單順序依此物件的 key 順序；設計稿是推薦、依開課時間，價格低到高是另加的第三項
export const SORT_LABELS: Record<SortMode, string> = {
  recommended: "推薦排序",
  time: "依開課時間近到遠",
  price: "依課程價格低到高",
};

export function parseSort(value: string | string[] | undefined): SortMode {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "time" || raw === "recommended" || raw === "price"
    ? raw
    : DEFAULT_SORT;
}

// ---- 排序用的純函式（不碰畫面、不碰網址，方便驗證） ----

const startTime = (course: Course) => new Date(course.startsAt).getTime();

// 開課時間由近到遠（startsAt 含日期與時間，所以「開課日期 → 開課時間」一次比完）
const byStart = (a: Course, b: Course) => startTime(a) - startTime(b);

// 固定順序：課程 id，確保每次結果一致
const byId = (a: Course, b: Course) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// 開課狀態（同推薦排序的邏輯，QA）：未達最低開課人數（差距少者在前）→ 已達仍可報名 → 已額滿
function statusGroup(course: Course) {
  return !isJoinable(course) ? 2 : gapOf(course) > 0 ? 0 : 1;
}
function byStatus(a: Course, b: Course) {
  const group = statusGroup(a) - statusGroup(b);
  if (group !== 0) return group;
  return statusGroup(a) === 0 ? gapOf(a) - gapOf(b) : 0;
}

function byStartThenId(a: Course, b: Course) {
  return byStart(a, b) || byId(a, b);
}

// 差距 = 最低開課人數 − 已報名人數，最小為 0
export function gapOf(course: Course) {
  return Math.max(course.minToOpen - course.enrolled, 0);
}

// 可報名：目前只看是否額滿；之後接真資料時再加上「招生中、未截止、未取消」
export function isJoinable(course: Course) {
  return course.enrolled < course.capacity;
}

// 依開課時間：開課日期 → 開課時間 → 開課狀態 → 固定順序（QA）
export function sortByStartTime(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => byStart(a, b) || byStatus(a, b) || byId(a, b));
}

// 依課程價格：價格 → 開課日期 → 開課時間 → 開課狀態 → 固定順序（QA）
export function sortByPrice(courses: Course[]): Course[] {
  return [...courses].sort(
    (a, b) => a.price - b.price || byStart(a, b) || byStatus(a, b) || byId(a, b),
  );
}

// 推薦排序（目標是提升開課成功率）。分三組，依序排列：
//   1. 未達最低開課人數：全部排在已達開課人數之前。差距少的在前 → 開課時間近的在前
//   2. 已達最低開課人數、仍可報名：開課時間近的在前
//   3. 不可報名（額滿）：開課時間近的在前，排在最後
// 條件都相同時用課程 id 排序，確保每次順序一致。
export function sortRecommended(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => byStatus(a, b) || byStartThenId(a, b));
}

// 入口：依排序方式排好（不修改傳入的陣列）
export function sortCourses(courses: Course[], mode: SortMode): Course[] {
  if (mode === "recommended") return sortRecommended(courses);
  if (mode === "price") return sortByPrice(courses);
  return sortByStartTime(courses);
}
