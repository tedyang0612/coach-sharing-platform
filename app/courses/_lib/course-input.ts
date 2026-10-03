// 開課表單的欄位解析、驗證與場次時間表。純函式、不碰資料庫，
// 前端用來決定發布按鈕要不要 disable；server action 送出前再跑一次當第二道防線。

import { SPORT_TYPES, type Course, type CourseLevel } from "@/types/database";
import { CONTACT_INFO_MESSAGE, containsContactInfo } from "./contact-filter";
import { COVER_URL_ERROR, isAllowedCoverUrl } from "./cover-image";

// 畫面文案（10/3 組員討論）；DB 的值不變，2.0 篩選請用同一份 label
export const COURSE_LEVELS: { value: CourseLevel; label: string }[] = [
  { value: "unlimited", label: "全程度" },
  { value: "beginner", label: "初階" },
  { value: "intermediate", label: "中階" },
  { value: "advanced", label: "進階" },
];

export const DEFAULT_DEADLINE_HOURS = 24;
// 第一堂選了開始時間、還沒選結束時間時，結束時間預設 +60 分鐘（組長確認的預設時長）
export const DEFAULT_DURATION_MINUTES = 60;
export const MAX_SESSIONS = 10;

// 時間下拉選單的範圍與間隔（10 分鐘一格）
export const TIME_STEP_MINUTES = 10;
export const EARLIEST_TIME = 6 * 60; // 06:00
export const LATEST_TIME = 23 * 60 + 50; // 23:50

// 平台目前只在台灣營運，台灣沒有日光節約時間，固定 +08:00。
// 場次時間一律在這裡帶時區組成 timestamptz，不交給 DB 的 session timezone（預設 UTC）解讀。
export const COURSE_TZ_OFFSET = "+08:00";

/** 一堂課的時間（台灣時間 HH:MM） */
export type SessionSlotInput = { start: string; end: string };

export const COURSE_FIELDS = [
  "title",
  "sport_type",
  "level",
  "location_name",
  "location_address",
  "session_date",
  "session_slots", // JSON 字串，見 serializeSlots()
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

// PRD 1.0 AC1：這些欄位齊全後發布按鈕才可點擊（場次時間＝每一堂都要有開始與結束）
export const REQUIRED_FIELDS: CourseField[] = [
  "title",
  "sport_type",
  "location_name",
  "location_address",
  "session_date",
  "session_slots",
  "price_per_person",
  "min_participants",
  "max_participants",
];

// 有人報名後鎖住的欄位以外，還能改的欄位：課程須知／QA，以及封面圖（PRD 1.0 規格8 調整後確認可換圖）
export const ALWAYS_EDITABLE_FIELDS: CourseField[] = ["notes", "cover_image_url"];

// 改到這些欄位就要重建場次
export const SCHEDULE_FIELDS: CourseField[] = ["session_date", "session_slots", "registration_deadline_hours"];

const PUBLIC_TEXT_FIELDS: CourseField[] = ["title", "description", "notes"];

/** 驗證通過後要寫進 courses 的資料（time_range_*／session_duration_minutes 由時間表推導，給舊欄位用） */
export type CourseInput = {
  title: string;
  sport_type: string;
  level: CourseLevel;
  location_name: string;
  location_address: string;
  session_date: string; // YYYY-MM-DD
  session_slots: SessionSlotInput[];
  time_range_start: string; // 第一堂開始
  time_range_end: string; // 最後一堂結束
  session_duration_minutes: number; // 第一堂時長
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

// ---------- 時間工具 ----------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function toHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** time + minutes；超過 LATEST_TIME 回傳 null */
export function addMinutes(time: string, minutes: number): string | null {
  const total = minutesOf(time) + minutes;
  return total > LATEST_TIME ? null : toHHMM(total);
}

export function toTaipeiDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${COURSE_TZ_OFFSET}`);
}

// ---------- 場次時間表 ----------

export function serializeSlots(slots: SessionSlotInput[]): string {
  return JSON.stringify(slots);
}

/** 解析表單送來的 JSON；格式不對回傳 null（交給驗證報錯），空字串視為沒有任何一堂 */
export function parseSlots(raw: string): SessionSlotInput[] | null {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return null;
    const slots = value.map((s) =>
      s && typeof s === "object"
        ? { start: String((s as SessionSlotInput).start ?? ""), end: String((s as SessionSlotInput).end ?? "") }
        : null
    );
    return slots.every(Boolean) ? (slots as SessionSlotInput[]) : null;
  } catch {
    return null;
  }
}

/**
 * 按「＋ 新增一堂」時要加的那一堂：接續上一堂的結束時間，沿用上一堂的時長。
 * 例：上一堂 15:00–16:30 → 新的一堂 16:30–18:00。上一堂還沒填完、或會超過當天最晚時間時回傳 null。
 */
export function nextSlot(slots: SessionSlotInput[]): SessionSlotInput | null {
  const last = slots.at(-1);
  if (!last || !TIME_RE.test(last.start) || !TIME_RE.test(last.end)) return null;
  const duration = minutesOf(last.end) - minutesOf(last.start);
  if (duration <= 0) return null;
  const end = addMinutes(last.end, duration);
  return end ? { start: last.end, end } : null;
}

/**
 * 從 DB 的課程取出時間表。舊資料（session_slots 為 null）依時間區間＋每堂長度平均切分推回來，
 * 邏輯同原本的切分方式：14:00–17:00、60 分鐘 → 14:00–15:00、15:00–16:00、16:00–17:00。
 */
export function slotsFromCourse(
  course: Pick<Course, "session_slots" | "time_range_start" | "time_range_end" | "session_duration_minutes">
): SessionSlotInput[] {
  if (course.session_slots && course.session_slots.length > 0) return course.session_slots;
  const start = minutesOf(course.time_range_start.slice(0, 5));
  const end = minutesOf(course.time_range_end.slice(0, 5));
  const duration = course.session_duration_minutes;
  const slots: SessionSlotInput[] = [];
  for (let s = start; duration > 0 && s + duration <= end; s += duration) {
    slots.push({ start: toHHMM(s), end: toHHMM(s + duration) });
  }
  return slots;
}

/** 依日期＋時間表算出要寫進 sessions 的時間（一律以台灣時間解讀） */
export function computeSessionSlots(input: {
  session_date: string;
  session_slots: SessionSlotInput[];
  registration_deadline_hours: number;
}): SessionSlot[] {
  const deadlineMs = input.registration_deadline_hours * 60 * 60 * 1000;
  return input.session_slots.map((slot) => {
    const startAt = toTaipeiDate(input.session_date, slot.start);
    return {
      startAt,
      endAt: toTaipeiDate(input.session_date, slot.end),
      registrationDeadlineAt: new Date(startAt.getTime() - deadlineMs),
    };
  });
}

/** 時間表的錯誤訊息；沒問題回傳 null。堂與堂之間可以有空檔，但不能重疊 */
export function validateSlots(slots: SessionSlotInput[]): string | null {
  if (slots.length === 0) return "請設定第一堂的開始與結束時間";
  if (slots.length > MAX_SESSIONS) return `一門課最多 ${MAX_SESSIONS} 堂`;
  for (let i = 0; i < slots.length; i++) {
    const { start, end } = slots[i];
    const label = `第 ${i + 1} 堂`;
    if (!start || !end) return `請設定${label}的開始與結束時間`;
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) return `${label}的時間格式不正確`;
    if (minutesOf(end) <= minutesOf(start)) return `${label}的結束時間需晚於開始時間`;
    if (i > 0 && minutesOf(start) < minutesOf(slots[i - 1].end)) return `${label}與第 ${i} 堂時間重疊`;
  }
  return null;
}

// ---------- 表單值 ----------

export function emptyCourseFormValues(): CourseFormValues {
  const values = Object.fromEntries(COURSE_FIELDS.map((f) => [f, ""])) as CourseFormValues;
  values.level = "unlimited";
  values.registration_deadline_hours = String(DEFAULT_DEADLINE_HOURS);
  values.session_slots = serializeSlots([{ start: "", end: "" }]);
  return values;
}

export function formDataToCourseValues(formData: FormData): CourseFormValues {
  return Object.fromEntries(
    COURSE_FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()])
  ) as CourseFormValues;
}

/** 從 DB 的課程轉回表單值（範本／複製帶入、編輯用） */
export function courseRowToFormValues(course: Course): CourseFormValues {
  const values = emptyCourseFormValues();
  for (const f of COURSE_FIELDS) {
    if (f === "session_slots") continue;
    const v = course[f];
    if (v !== null && v !== undefined) values[f] = String(v);
  }
  values.session_slots = serializeSlots(slotsFromCourse(course));
  return values;
}

/** 必填欄位是否都有值——前端用這個決定發布按鈕 disabled，不等送出才報錯 */
export function hasAllRequiredFields(values: CourseFormValues): boolean {
  return REQUIRED_FIELDS.every((f) => {
    if (f !== "session_slots") return values[f].trim() !== "";
    const slots = parseSlots(values.session_slots);
    return !!slots && slots.length > 0 && slots.every((s) => s.start && s.end);
  });
}

function toInt(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
}

export type ValidateOptions = {
  /** 發布時要求第一堂的報名截止時間還沒過；存範本時不檢查日期 */
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
    if (f !== "session_slots" && !values[f]) errors[f] = "此欄位為必填";
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

  if (values.session_date && !DATE_RE.test(values.session_date)) errors.session_date = "日期格式不正確";

  const slots = parseSlots(values.session_slots);
  const slotError = slots ? validateSlots(slots) : "場次時間格式不正確";
  if (slotError) errors.session_slots = slotError;

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

  if (Object.keys(errors).length > 0 || !slots) return { errors };

  const first = slots[0];
  const input: CourseInput = {
    title: values.title,
    sport_type: values.sport_type,
    level: level as CourseLevel,
    location_name: values.location_name,
    location_address: values.location_address,
    session_date: values.session_date,
    session_slots: slots,
    time_range_start: first.start,
    time_range_end: slots.at(-1)!.end,
    session_duration_minutes: minutesOf(first.end) - minutesOf(first.start),
    price_per_person: price,
    min_participants: min!,
    max_participants: max!,
    registration_deadline_hours: deadlineHours!,
    description: values.description || null,
    notes: values.notes || null,
    cover_image_url: values.cover_image_url || null,
  };

  if (requireFutureDeadline && computeSessionSlots(input)[0].registrationDeadlineAt <= now) {
    return {
      errors: {
        session_date: `第一堂的報名截止時間已過（需在開課前 ${input.registration_deadline_hours} 小時發布）`,
      },
    };
  }

  return { input };
}
