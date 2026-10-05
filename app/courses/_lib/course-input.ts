// 開課表單的欄位解析、驗證與場次切分。純函式、不碰資料庫，
// 前端用來決定發布按鈕要不要 disable、即時預覽場次；server action 送出前再跑一次當第二道防線。

import { SPORT_TYPES, type CourseLevel } from "@/types/database";
import { CONTACT_INFO_MESSAGE, containsContactInfo } from "./contact-filter";
import { COVER_URL_ERROR, isAllowedCoverUrl } from "./cover-image";

export const COURSE_LEVELS: { value: CourseLevel; label: string }[] = [
  { value: "unlimited", label: "不限" },
  { value: "beginner", label: "初級" },
  { value: "intermediate", label: "中級" },
  { value: "advanced", label: "進階" }, // PM 決定加回（20261003000024）
];

export const DEFAULT_DEADLINE_HOURS = 24;
// 組長確認：每堂長度預設 60 分鐘，教練不改也能直接發布
export const DEFAULT_DURATION_MINUTES = 60;

// 平台目前只在台灣營運，台灣沒有日光節約時間，固定 +08:00。
// 場次時間一律在這裡帶時區組成 timestamptz，不交給 DB 的 session timezone（預設 UTC）解讀。
export const COURSE_TZ_OFFSET = "+08:00";

export const COURSE_FIELDS = [
  "title",
  "sport_type",
  "level",
  "location_name",
  "location_address",
  "district_id",
  "session_date",
  "time_range_start",
  "time_range_end",
  "session_duration_minutes",
  "price_per_person",
  "min_participants",
  "max_participants",
  "registration_deadline_hours",
  "description",
  "notes",
  "cover_image_url",
] as const;

export type CourseField = (typeof COURSE_FIELDS)[number];

/** 表單原始值（全部是字串，對應 <input name>） */
export type CourseFormValues = Record<CourseField, string>;

// PRD 1.0 AC：這些欄位齊全後發布按鈕才可點擊
export const REQUIRED_FIELDS: CourseField[] = [
  "title",
  "sport_type",
  "location_name",
  "location_address",
  "district_id",
  "session_date",
  "time_range_start",
  "time_range_end",
  "session_duration_minutes",
  "price_per_person",
  "min_participants",
  "max_participants",
];

// 有人報名後鎖住的欄位以外，還能改的欄位：課程須知／QA，以及封面圖（PRD 1.0 規格8 調整後確認可換圖）
export const ALWAYS_EDITABLE_FIELDS: CourseField[] = ["notes", "cover_image_url"];

// 改到這些欄位就要重新切場次
export const SCHEDULE_FIELDS: CourseField[] = [
  "session_date",
  "time_range_start",
  "time_range_end",
  "session_duration_minutes",
  "registration_deadline_hours",
];

const PUBLIC_TEXT_FIELDS: CourseField[] = ["title", "description", "notes"];

export type CourseInput = {
  title: string;
  sport_type: string;
  level: CourseLevel;
  location_name: string;
  location_address: string;
  district_id: number; // 縣市／行政區（districts.id，20261003000033）
  session_date: string; // YYYY-MM-DD
  time_range_start: string; // HH:MM
  time_range_end: string; // HH:MM
  session_duration_minutes: number;
  price_per_person: number;
  min_participants: number;
  max_participants: number;
  registration_deadline_hours: number;
  description: string | null;
  notes: string | null;
  cover_image_url: string | null; // null＝依運動項目顯示預設圖
};

export type CourseFieldErrors = Partial<Record<CourseField, string>>;

export type SessionSlot = {
  startAt: Date;
  endAt: Date;
  registrationDeadlineAt: Date;
};

export function emptyCourseFormValues(): CourseFormValues {
  const values = Object.fromEntries(COURSE_FIELDS.map((f) => [f, ""])) as CourseFormValues;
  values.level = "unlimited";
  values.registration_deadline_hours = String(DEFAULT_DEADLINE_HOURS);
  values.session_duration_minutes = String(DEFAULT_DURATION_MINUTES);
  return values;
}

export function formDataToCourseValues(formData: FormData): CourseFormValues {
  return Object.fromEntries(
    COURSE_FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()])
  ) as CourseFormValues;
}

/** 從 DB 的 course row 轉回表單值（範本／複製帶入用）；DB 的 time 會帶秒數，這裡截成 HH:MM */
export function courseRowToFormValues(row: {
  [K in CourseField]: string | number | null;
}): CourseFormValues {
  const values = emptyCourseFormValues();
  for (const f of COURSE_FIELDS) {
    const v = row[f];
    if (v === null || v === undefined) continue;
    values[f] = f === "time_range_start" || f === "time_range_end" ? String(v).slice(0, 5) : String(v);
  }
  return values;
}

/** 必填欄位是否都有值——前端用這個決定發布按鈕 disabled，不等送出才報錯 */
export function hasAllRequiredFields(values: CourseFormValues): boolean {
  return REQUIRED_FIELDS.every((f) => values[f].trim() !== "");
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function toInt(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
}

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function toTaipeiDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${COURSE_TZ_OFFSET}`);
}

/**
 * 依時間區間＋課程長度切出場次（PRD 1.0 規格2）。
 * 例：14:00–17:00、60 分鐘 → 14:00、15:00、16:00 三場；最後不足一堂的零頭捨棄。
 * 邏輯和 DB 的 generate_sessions_for_course() 一致，但時間一律以台灣時間計算。
 */
export function computeSessionSlots(input: {
  session_date: string;
  time_range_start: string;
  time_range_end: string;
  session_duration_minutes: number;
  registration_deadline_hours: number;
}): SessionSlot[] {
  const slots: SessionSlot[] = [];
  const duration = input.session_duration_minutes;
  if (!(duration > 0)) return slots;

  const rangeStart = minutesOf(input.time_range_start);
  const rangeEnd = minutesOf(input.time_range_end);
  const base = toTaipeiDate(input.session_date, "00:00").getTime();
  const deadlineMs = input.registration_deadline_hours * 60 * 60 * 1000;

  for (let start = rangeStart; start + duration <= rangeEnd; start += duration) {
    const startAt = new Date(base + start * 60 * 1000);
    slots.push({
      startAt,
      endAt: new Date(startAt.getTime() + duration * 60 * 1000),
      registrationDeadlineAt: new Date(startAt.getTime() - deadlineMs),
    });
  }
  return slots;
}

function formatMinutes(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * 時間區間切完場次後剩下、不足一堂的時段（不會產生場次，表單要提示教練）。
 * 例：14:00–17:00、每堂 120 分鐘 → 剩 16:00–17:00。剛好切完回傳 null。
 */
export function computeLeftover(input: {
  time_range_start: string;
  time_range_end: string;
  session_duration_minutes: number;
}): { start: string; end: string; minutes: number } | null {
  const duration = input.session_duration_minutes;
  if (!(duration > 0)) return null;
  const rangeStart = minutesOf(input.time_range_start);
  const rangeEnd = minutesOf(input.time_range_end);
  const minutes = (rangeEnd - rangeStart) % duration;
  if (rangeEnd <= rangeStart || minutes === 0 || rangeEnd - rangeStart < duration) return null;
  return { start: formatMinutes(rangeEnd - minutes), end: formatMinutes(rangeEnd), minutes };
}

export type ValidateOptions = {
  /** 發布時要求第一個場次的報名截止時間還沒過；存範本時不檢查日期 */
  requireFutureDeadline: boolean;
  now?: Date;
  /** server 端帶入：上傳的封面圖必須在這位教練自己的資料夾 */
  userId?: string;
};

export function validateCourseValues(
  values: CourseFormValues,
  { requireFutureDeadline, now = new Date(), userId }: ValidateOptions
): { input: CourseInput; errors?: undefined } | { input?: undefined; errors: CourseFieldErrors } {
  const errors: CourseFieldErrors = {};

  for (const f of REQUIRED_FIELDS) {
    if (!values[f]) errors[f] = "此欄位為必填";
  }

  for (const f of PUBLIC_TEXT_FIELDS) {
    if (!errors[f] && containsContactInfo(values[f])) errors[f] = CONTACT_INFO_MESSAGE;
  }

  if (
    values.cover_image_url &&
    !isAllowedCoverUrl(values.cover_image_url, {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      userId,
    })
  ) {
    errors.cover_image_url = COVER_URL_ERROR;
  }

  // PRD v4.2：運動項目擇一，開課與學員篩選皆以 MVP 八種為限
  if (values.sport_type && !(SPORT_TYPES as readonly string[]).includes(values.sport_type)) {
    errors.sport_type = "請從清單選擇運動項目";
  }

  const level = values.level || "unlimited";
  if (!COURSE_LEVELS.some((l) => l.value === level)) errors.level = "請選擇運動程度";

  // 是否真的是 districts 裡的 id 由 DB 外鍵把關，這裡只擋格式
  const districtId = toInt(values.district_id);
  if (values.district_id && (districtId === null || districtId < 1)) errors.district_id = "請選擇縣市與行政區";

  if (values.session_date && !DATE_RE.test(values.session_date)) errors.session_date = "日期格式不正確";
  if (values.time_range_start && !TIME_RE.test(values.time_range_start)) {
    errors.time_range_start = "時間格式不正確";
  }
  if (values.time_range_end && !TIME_RE.test(values.time_range_end)) {
    errors.time_range_end = "時間格式不正確";
  }
  if (
    !errors.time_range_start &&
    !errors.time_range_end &&
    values.time_range_start &&
    values.time_range_end &&
    minutesOf(values.time_range_end) <= minutesOf(values.time_range_start)
  ) {
    errors.time_range_end = "結束時間需晚於開始時間";
  }

  const duration = toInt(values.session_duration_minutes);
  if (values.session_duration_minutes && (duration === null || duration <= 0)) {
    errors.session_duration_minutes = "請輸入大於 0 的整數分鐘數";
  }

  const price = Number(values.price_per_person);
  if (values.price_per_person && (!Number.isFinite(price) || price < 0 || !/^\d+(\.\d{1,2})?$/.test(values.price_per_person))) {
    errors.price_per_person = "請輸入正確的金額";
  }

  const min = toInt(values.min_participants);
  const max = toInt(values.max_participants);
  if (values.min_participants && (min === null || min < 1)) errors.min_participants = "人數下限至少為 1";
  if (values.max_participants && (max === null || max < 1)) errors.max_participants = "人數上限至少為 1";
  if (min !== null && max !== null && min >= 1 && max < min) {
    errors.max_participants = "人數上限不可低於人數下限";
  }

  const deadlineHours = values.registration_deadline_hours
    ? toInt(values.registration_deadline_hours)
    : DEFAULT_DEADLINE_HOURS;
  if (deadlineHours === null || deadlineHours < DEFAULT_DEADLINE_HOURS) {
    errors.registration_deadline_hours = `報名截止至少為開課前 ${DEFAULT_DEADLINE_HOURS} 小時`;
  }

  if (Object.keys(errors).length > 0) return { errors };

  const input: CourseInput = {
    title: values.title,
    sport_type: values.sport_type,
    level: level as CourseLevel,
    location_name: values.location_name,
    location_address: values.location_address,
    district_id: districtId!,
    session_date: values.session_date,
    time_range_start: values.time_range_start,
    time_range_end: values.time_range_end,
    session_duration_minutes: duration!,
    price_per_person: price,
    min_participants: min!,
    max_participants: max!,
    registration_deadline_hours: deadlineHours!,
    description: values.description || null,
    notes: values.notes || null,
    cover_image_url: values.cover_image_url || null,
  };

  const slots = computeSessionSlots(input);
  if (slots.length === 0) {
    return { errors: { session_duration_minutes: "課程時程超過可授課時間區間，無法產生任何場次" } };
  }
  if (requireFutureDeadline && slots[0].registrationDeadlineAt <= now) {
    return {
      errors: {
        session_date: `第一個場次的報名截止時間已過（需在開課前 ${input.registration_deadline_hours} 小時發布）`,
      },
    };
  }

  return { input };
}
