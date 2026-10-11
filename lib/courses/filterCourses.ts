import {
  FILTER_LEVELS,
  SPORTS,
  TIME_SLOT_LABELS,
  TIME_SLOT_RANGES,
  type Course,
  type Level,
  type TimeSlot,
} from "./types";
import { DEFAULT_SORT, type SortMode } from "./sort";

// undefined 代表「不限」
export interface CourseFilters {
  city?: string;
  district?: string; // 行政區，需搭配縣市一起用（不同縣市可能有同名行政區，例如「中山區」）
  date?: string; // 日期 YYYY-MM-DD；只填這個＝單一日期，和 dateTo 一起填＝日期區間（含頭尾）
  dateTo?: string; // 日期區間的結束日
  weekdays?: number[]; // 星期，1 = 星期一 … 7 = 星期日，可複選（同類選項採 OR）
  timeSlots?: TimeSlot[]; // 快速時段，可複選（OR）；和指定時間擇一
  timeFrom?: string; // 指定時間的開始，"HH:MM"
  timeTo?: string; // 指定時間的結束，"HH:MM"
  level?: Level;
  sport?: string;
  priceMin?: number; // 每人費用下限（NT$，含），自己輸入
  priceMax?: number; // 每人費用上限（NT$，含）
}

type RawSearchParams = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseTime(value: string | string[] | undefined) {
  const raw = first(value);
  return raw && TIME_PATTERN.test(raw) ? raw : undefined;
}

function parseDate(value: string | string[] | undefined) {
  const raw = first(value);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  // 擋掉 2026-02-31 這種不存在的日期
  const parsed = new Date(`${raw}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === raw
    ? raw
    : undefined;
}

const toMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

// 星期與時間一律用台灣時區判斷（Vercel server 是 UTC，不指定時區會差 8 小時）
const startFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Taipei",
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
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
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: WEEKDAY_BY_NAME[get("weekday")],
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

// 日期區間的開始晚於結束時不套用，畫面上會提示
export function isDateRangeInvalid(filters: CourseFilters) {
  return Boolean(filters.date && filters.dateTo && filters.date > filters.dateTo);
}

// 價格上限的預設值：只填最低價時，條件是 最低價 ~ 9,999,999（QA 規格）
export const PRICE_MAX_DEFAULT = 9999999;

// 價格區間：只填最低價＝x～9,999,999；只填最高價＝0～x；
// 最高價小於最低價時自動對調（最高 1,000、最低 2,000 → 1,000～2,000），不再提示錯誤。
export function normalizedPriceRange(
  filters: CourseFilters,
): { min: number; max: number } | null {
  if (filters.priceMin === undefined && filters.priceMax === undefined) return null;
  const a = filters.priceMin ?? 0;
  const b = filters.priceMax ?? PRICE_MAX_DEFAULT;
  return a <= b ? { min: a, max: b } : { min: b, max: a };
}

// 價格只收 0 以上的整數；其他（空白、負數、小數、文字）當成沒填
function parsePrice(value: string | string[] | undefined) {
  const raw = first(value);
  return raw && /^\d{1,7}$/.test(raw) ? Number(raw) : undefined;
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
  const date = parseDate(params.date);
  const dateTo = parseDate(params.dateTo);
  const timeFrom = parseTime(first(params.from));
  const timeTo = parseTime(first(params.to));
  const level = first(params.level);
  const sport = first(params.sport);

  return {
    city: city || undefined,
    district: city && district ? district : undefined,
    date,
    dateTo,
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
        ? (level as Level)
        : undefined,
    sport:
      sport && (SPORTS as readonly string[]).includes(sport) ? sport : undefined,
    priceMin: parsePrice(params.priceMin),
    priceMax: parsePrice(params.priceMax),
  };
}

// 選初階／中階／進階時，程度為「不限」的課一併列出（初學者也能參加）；
// 選「不限」只列程度為「不限」的課；沒選＝不篩選。
function matchesLevel(courseLevel: Level, selected: Level) {
  return (
    courseLevel === selected ||
    (selected !== "unlimited" && courseLevel === "unlimited")
  );
}

export function filterCourses(courses: Course[], filters: CourseFilters) {
  const priceRange = normalizedPriceRange(filters);

  const useCustomTime =
    (filters.timeFrom || filters.timeTo) && !isTimeRangeInvalid(filters);
  const useDate = (filters.date || filters.dateTo) && !isDateRangeInvalid(filters);
  const needsStart = Boolean(
    filters.weekdays || filters.timeSlots || useCustomTime || useDate,
  );

  return courses.filter((course) => {
    const start = needsStart ? startParts(course.startsAt) : null;
    return (
      (!filters.city || course.city === filters.city) &&
      (!filters.district || course.district === filters.district) &&
      // 日期：只填一天＝單一日期；填兩天＝區間；只填結束日＝這一天以前
      (!useDate ||
        (filters.dateTo
          ? (!filters.date || start!.date >= filters.date) &&
            start!.date <= filters.dateTo
          : start!.date === filters.date)) &&
      (!filters.weekdays || filters.weekdays.includes(start!.weekday)) &&
      (!filters.timeSlots ||
        filters.timeSlots.some((slot) => {
          const [from, to] = TIME_SLOT_RANGES[slot];
          return start!.minutes >= from && start!.minutes <= to;
        })) &&
      (!useCustomTime ||
        ((!filters.timeFrom || start!.minutes >= toMinutes(filters.timeFrom)) &&
          (!filters.timeTo || start!.minutes <= toMinutes(filters.timeTo)))) &&
      (!filters.level || matchesLevel(course.level, filters.level)) &&
      (!filters.sport || course.sport === filters.sport) &&
      (!priceRange ||
        (course.price >= priceRange.min && course.price <= priceRange.max))
    );
  });
}

// 篩選條件與排序方式組成網址的查詢字串，分享出去能還原同樣的結果。
export function filtersToQuery(filters: CourseFilters, sort: SortMode) {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.city && filters.district) params.set("district", filters.district);
  if (filters.date) params.set("date", filters.date);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.weekdays?.length) params.set("days", filters.weekdays.join(","));
  if (filters.timeSlots?.length) params.set("slot", filters.timeSlots.join(","));
  if (filters.timeFrom) params.set("from", filters.timeFrom);
  if (filters.timeTo) params.set("to", filters.timeTo);
  if (filters.level) params.set("level", filters.level);
  if (filters.sport) params.set("sport", filters.sport);
  if (filters.priceMin !== undefined) params.set("priceMin", String(filters.priceMin));
  if (filters.priceMax !== undefined) params.set("priceMax", String(filters.priceMax));
  if (sort !== DEFAULT_SORT) params.set("sort", sort);
  return params.toString();
}

export function hasActiveFilters(filters: CourseFilters) {
  return Boolean(
    filters.city ||
      filters.district ||
      filters.date ||
      filters.dateTo ||
      filters.weekdays ||
      filters.timeSlots ||
      filters.timeFrom ||
      filters.timeTo ||
      filters.level ||
      filters.sport ||
      filters.priceMin !== undefined ||
      filters.priceMax !== undefined,
  );
}
