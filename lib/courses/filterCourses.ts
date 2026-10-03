import type { Coordinates } from "./distance";
import {
  FILTER_LEVELS,
  PRICE_RANGES,
  SPORTS,
  TIME_SLOT_LABELS,
  TIME_SLOT_RANGES,
  type Course,
  type FilterLevel,
  type TimeSlot,
} from "./types";

// 無法取得使用者位置時，預設顯示這個城市的課程
export const DEFAULT_CITY = "台北市";

// undefined 代表「不限」
export interface CourseFilters {
  city?: string;
  district?: string; // 行政區，需搭配縣市一起用（不同縣市可能有同名行政區，例如「中山區」）
  weekdays?: number[]; // 星期，1 = 星期一 … 7 = 星期日，可複選（同類選項採 OR）
  timeSlots?: TimeSlot[]; // 快速時段，可複選（OR）；和指定時間擇一
  timeFrom?: string; // 指定時間的開始，"HH:MM"
  timeTo?: string; // 指定時間的結束，"HH:MM"
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

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseTime(value: string | string[] | undefined) {
  const raw = first(value);
  return raw && TIME_PATTERN.test(raw) ? raw : undefined;
}

const toMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

// 星期與時間一律用台灣時區判斷（Vercel server 是 UTC，不指定時區會差 8 小時）
const startFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Taipei",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const WEEKDAY_BY_NAME: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

// 開課時間的「星期」與「當天第幾分鐘」；篩選看的是場次的開始時間
function startParts(iso: string) {
  const parts = startFormatter.formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    weekday: WEEKDAY_BY_NAME[get("weekday")],
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

// 指定時間的開始晚於結束時（例如 22:00–19:00）不套用，畫面上會提示
export function isTimeRangeInvalid(filters: CourseFilters) {
  return Boolean(
    filters.timeFrom && filters.timeTo && filters.timeFrom > filters.timeTo,
  );
}

// 網址可能被手動亂改，不合法的值一律當成「不限」，不要讓頁面壞掉。
export function parseFilters(params: RawSearchParams): CourseFilters {
  const city = first(params.city);
  const district = first(params.district);
  const slots = (first(params.slot) ?? "")
    .split(",")
    .filter((slot): slot is TimeSlot => slot in TIME_SLOT_LABELS);
  const days = (first(params.days) ?? "")
    .split(",")
    .map(Number)
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
  const timeFrom = parseTime(first(params.from));
  const timeTo = parseTime(first(params.to));
  const level = first(params.level);
  const sport = first(params.sport);
  const price = first(params.price);
  const lat = parseCoord(params.lat, -90, 90);
  const lng = parseCoord(params.lng, -180, 180);

  return {
    city: city || undefined,
    district: city && district ? district : undefined,
    weekdays: days.length ? [...new Set(days)].sort() : undefined,
    // 快速時段和指定時間擇一：網址同時帶時，以指定時間為準
    timeSlots:
      slots.length && !timeFrom && !timeTo
        ? (Object.keys(TIME_SLOT_LABELS) as TimeSlot[]).filter((slot) =>
            slots.includes(slot),
          )
        : undefined,
    timeFrom,
    timeTo,
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

  const useCustomTime =
    (filters.timeFrom || filters.timeTo) && !isTimeRangeInvalid(filters);
  const needsStart = Boolean(
    filters.weekdays || filters.timeSlots || useCustomTime,
  );

  return courses.filter((course) => {
    const start = needsStart ? startParts(course.startsAt) : null;
    return (
      (!filters.city || course.city === filters.city) &&
      (!filters.district || course.district === filters.district) &&
      (!filters.weekdays || filters.weekdays.includes(start!.weekday)) &&
      (!filters.timeSlots ||
        filters.timeSlots.some((slot) => {
          const [from, to] = TIME_SLOT_RANGES[slot];
          return start!.minutes >= from && start!.minutes <= to;
        })) &&
      (!useCustomTime ||
        ((!filters.timeFrom || start!.minutes >= toMinutes(filters.timeFrom)) &&
          (!filters.timeTo || start!.minutes <= toMinutes(filters.timeTo)))) &&
      (!filters.level ||
        course.level === filters.level ||
        (filters.level !== "unlimited" && course.level === "unlimited")) &&
      (!filters.sport || course.sport === filters.sport) &&
      (!range ||
        ((range.min === undefined || course.price >= range.min) &&
          (range.max === undefined || course.price <= range.max)))
    );
  });
}

export function hasActiveFilters(filters: CourseFilters) {
  return Boolean(
    filters.city ||
      filters.district ||
      filters.weekdays ||
      filters.timeSlots ||
      filters.timeFrom ||
      filters.timeTo ||
      filters.level ||
      filters.sport ||
      filters.priceRange ||
      filters.near,
  );
}
