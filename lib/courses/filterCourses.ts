import type { Coordinates } from "./distance";
import {
  FILTER_LEVELS,
  PRICE_RANGES,
  SPORTS,
  TIME_SLOT_LABELS,
  type Course,
  type FilterLevel,
  type TimeSlot,
} from "./types";

// 無法取得使用者位置時，預設顯示這個城市的課程
export const DEFAULT_CITY = "台北市";

// undefined 代表「不限」
export interface CourseFilters {
  city?: string;
  timeSlot?: TimeSlot;
  level?: FilterLevel;
  sport?: string;
  priceRange?: string; // PRICE_RANGES 的 id
  near?: Coordinates; // 有值代表「依距離排序」
}

type RawSearchParams = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseCoord(value: string | string[] | undefined, min: number, max: number) {
  const raw = first(value);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

// 網址可能被手動亂改，不合法的值一律當成「不限」，不要讓頁面壞掉。
export function parseFilters(params: RawSearchParams): CourseFilters {
  const city = first(params.city);
  const slot = first(params.slot);
  const level = first(params.level);
  const sport = first(params.sport);
  const price = first(params.price);
  const lat = parseCoord(params.lat, -90, 90);
  const lng = parseCoord(params.lng, -180, 180);

  return {
    city: city || undefined,
    timeSlot: slot && slot in TIME_SLOT_LABELS ? (slot as TimeSlot) : undefined,
    level:
      level && (FILTER_LEVELS as readonly string[]).includes(level)
        ? (level as FilterLevel)
        : undefined,
    sport:
      sport && (SPORTS as readonly string[]).includes(sport) ? sport : undefined,
    priceRange:
      price && PRICE_RANGES.some((range) => range.id === price)
        ? price
        : undefined,
    near: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
  };
}

export function filterCourses(courses: Course[], filters: CourseFilters) {
  const range = PRICE_RANGES.find((r) => r.id === filters.priceRange);

  return courses.filter(
    (course) =>
      (!filters.city || course.city === filters.city) &&
      (!filters.timeSlot || course.timeSlot === filters.timeSlot) &&
      (!filters.level ||
        course.level === filters.level ||
        course.level === "unlimited") &&
      (!filters.sport || course.sport === filters.sport) &&
      (!range ||
        ((range.min === undefined || course.price >= range.min) &&
          (range.max === undefined || course.price <= range.max))),
  );
}

export function hasActiveFilters(filters: CourseFilters) {
  return Boolean(
    filters.city ||
      filters.timeSlot ||
      filters.level ||
      filters.sport ||
      filters.priceRange ||
      filters.near,
  );
}
