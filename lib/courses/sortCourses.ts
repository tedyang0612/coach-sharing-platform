import type { Course } from "./types";

// 基本排序：依開課時間由近到遠（規格 2.0）。
// 不修改傳入的陣列。Array.sort 是穩定排序，所以開課時間相同的課程維持原本順序。
export function sortByStartTime(courses: Course[]): Course[] {
  return [...courses].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}
