import {
  LEVEL_LABELS,
  TIME_SLOT_LABELS,
  type Course,
  type Level,
  type TimeSlot,
} from "./types";

// undefined 代表「不限」
export interface CourseFilters {
  city?: string;
  timeSlot?: TimeSlot;
  level?: Level;
}

type RawSearchParams = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// 網址可能被手動亂改，不合法的值一律當成「不限」，不要讓頁面壞掉。
export function parseFilters(params: RawSearchParams): CourseFilters {
  const city = first(params.city);
  const slot = first(params.slot);
  const level = first(params.level);

  return {
    city: city || undefined,
    timeSlot: slot && slot in TIME_SLOT_LABELS ? (slot as TimeSlot) : undefined,
    level: level && level in LEVEL_LABELS ? (level as Level) : undefined,
  };
}

export function filterCourses(courses: Course[], filters: CourseFilters) {
  return courses.filter(
    (course) =>
      (!filters.city || course.city === filters.city) &&
      (!filters.timeSlot || course.timeSlot === filters.timeSlot) &&
      (!filters.level || course.level === filters.level),
  );
}

export function hasActiveFilters(filters: CourseFilters) {
  return Boolean(filters.city || filters.timeSlot || filters.level);
}
