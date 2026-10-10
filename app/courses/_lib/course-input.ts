// 開課表單的欄位解析、驗證與場次時間表。純函式、不碰資料庫，
// 前端用來決定發布按鈕要不要 disable；server action 送出前再跑一次當第二道防線。

import { SPORT_TYPES, type Course, type CourseLevel, type CourseQaItem } from "@/types/database";
import { CONTACT_INFO_MESSAGE, containsContactInfo } from "./contact-filter";
import { COVER_URL_ERROR, isAllowedCoverUrl } from "./cover-image";

// 畫面文案：不限／初階／中階／進階（10/4 定案，取代 10/3 的「全程度」）；DB 的值不變，2.0 篩選請用同一份 label
export const COURSE_LEVELS: { value: CourseLevel; label: string }[] = [
  { value: "unlimited", label: "不限" },
  { value: "beginner", label: "初階" },
  { value: "intermediate", label: "中階" },
  { value: "advanced", label: "進階" },
];

export const DEFAULT_DEADLINE_HOURS = 24;
// 報名截止的選項（小時）；既有課程若存的是其他值（例如 36）表單仍會保留該值，不會被改掉
export const DEADLINE_OPTIONS = [24, 48, 72];
// 第一堂選了開始時間、還沒選結束時間時，結束時間預設 +60 分鐘（組長確認的預設時長）
export const DEFAULT_DURATION_MINUTES = 60;
export const MAX_SESSIONS = 10;

// 時間下拉選單的範圍與間隔（10 分鐘一格）
export const TIME_STEP_MINUTES = 10;
export const EARLIEST_TIME = 0; // 00:00（10/3 組員討論：小時 00–23 都可選）
export const LATEST_TIME = 23 * 60 + 50; // 開始時間最晚 23:50
export const END_OF_DAY = 24 * 60; // 結束時間最晚 24:00（鯨魚 QA：場次要能排到午夜）

// 欄位長度與數值範圍（鯨魚 QA、PRD v4.7；資料庫另有同樣的 check，見 20261005000039）
export const TITLE_MIN = 2;
export const TITLE_MAX = 30;
export const LOCATION_NAME_MIN = 2;
export const LOCATION_NAME_MAX = 40;
export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 600;
export const NOTES_MAX = 300; // 課程須知：穿著、裝備、集合方式等簡短說明
export const TEMPLATE_NAME_MIN = 2;
export const TEMPLATE_NAME_MAX = 40;
export const MIN_PRICE = 200; // PRD v4.7：每人費用下限 NT$200，不提供 0 元課程
export const MAX_PARTICIPANTS_CAP = 999; // PRD v4.7：人數上限最多 999

// 課程 QA（PRD v4.7 1.0 規格 9）。數量與字數上限不在 PRD 內，是為了避免畫面被塞爆而加的保守值
export const MAX_QA_ITEMS = 10;
export const QA_QUESTION_MAX = 50;
export const QA_ANSWER_MAX = 200;
export const QA_TEMPLATE_QUESTIONS = [
  "我是完全的初學者，沒有基礎也可以報名嗎？",
  "上課需要準備什麼裝備或穿著？",
  "有年齡限制嗎？",
];

// 平台目前只在台灣營運，台灣沒有日光節約時間，固定 +08:00。
// 場次時間一律在這裡帶時區組成 timestamptz，不交給 DB 的 session timezone（預設 UTC）解讀。
export const COURSE_TZ_OFFSET = "+08:00";

/** 一堂課的時間（台灣時間 HH:MM） */
export type SessionSlotInput = {
  start: string;
  end: string;
  /** 編輯已發布的課程時，這一堂對應的場次 id（新增的一堂沒有）；用來逐場次比對更新、刪除、新增 */
  sessionId?: string;
  /** 這一堂已有人報名（或場次已不是招生中），時間不能改、不能刪除；只是畫面用，server 一律以資料庫為準 */
  locked?: boolean;
};

export const COURSE_FIELDS = [
  "title",
  "sport_type",
  "level",
  "location_name",
  "location_address",
  "district_id",
  "session_date",
  "session_slots", // JSON 字串，見 serializeSlots()
  "price_per_person",
  "min_participants",
  "max_participants",
  "registration_deadline_hours",
  "description",
  "notes",
  "qa", // JSON 字串，見 serializeQa()
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
  "district_id",
  "session_date",
  "session_slots",
  "price_per_person",
  "min_participants",
  "max_participants",
  "description", // 鯨魚 QA：課程介紹改為必填（20–600 字）
];

// 有人報名後鎖住的欄位以外，還能改的欄位：課程須知、課程 QA，以及封面圖（PRD 1.0 規格8 調整後確認可換圖）
export const ALWAYS_EDITABLE_FIELDS: CourseField[] = ["notes", "qa", "cover_image_url"];

// 有人報名後（PRD v4.8 1.0 規格 4）：課程共用資料全部鎖定，仍可改的有公告、QA、封面圖；
// 場次時間依各場次判斷：沒有人報名的場次仍可調整時間、刪除或新增，所以場次時間表也算可編輯（有人報名的那一堂在畫面與 server 各自擋）
export const LOCKED_EDITABLE_FIELDS: CourseField[] = [...ALWAYS_EDITABLE_FIELDS, "session_slots"];

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
  district_id: number; // 縣市／行政區（districts.id，20261003000033）
  session_date: string; // YYYY-MM-DD
  session_slots: SessionSlotInput[];
  time_range_start: string; // 第一堂開始
  time_range_end: string; // 最後一堂結束
  session_duration_minutes: number; // 第一堂時長
  price_per_person: number;
  min_participants: number;
  max_participants: number;
  registration_deadline_hours: number;
  description: string;
  notes: string | null;
  qa: CourseQaItem[]; // 只含問題與回答都有填的項目
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
// 結束時間可以是 24:00（午夜），開始時間不行
const END_TIME_RE = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;

/** 字數以字元（code point）計，和資料庫 char_length 一致；JS 的 .length 會把表情符號算成 2 */
export function charLength(value: string): number {
  return [...value].length;
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function toHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** time + minutes；超過 24:00 回傳 null（結果可以剛好是 24:00，只能當結束時間用） */
export function addMinutes(time: string, minutes: number): string | null {
  const total = minutesOf(time) + minutes;
  return total > END_OF_DAY ? null : toHHMM(total);
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
    const slots = value.map((s) => {
      if (!s || typeof s !== "object") return null;
      const raw = s as SessionSlotInput;
      const slot: SessionSlotInput = { start: String(raw.start ?? ""), end: String(raw.end ?? "") };
      if (typeof raw.sessionId === "string" && raw.sessionId) slot.sessionId = raw.sessionId;
      if (raw.locked === true) slot.locked = true;
      return slot;
    });
    return slots.every(Boolean) ? (slots as SessionSlotInput[]) : null;
  } catch {
    return null;
  }
}

/** 只留開始與結束時間（寫進資料庫的 courses.session_slots 與場次計算都不需要 sessionId／locked） */
export function cleanSlots(slots: SessionSlotInput[]): { start: string; end: string }[] {
  return slots.map(({ start, end }) => ({ start, end }));
}

/**
 * 按「＋ 新增一堂」時要加的那一堂：接續上一堂的結束時間，沿用上一堂的時長。
 * 例：上一堂 15:00–16:30 → 新的一堂 16:30–18:00。上一堂還沒填完、或會超過當天最晚時間時回傳 null。
 */
export function nextSlot(slots: SessionSlotInput[]): SessionSlotInput | null {
  const last = slots.at(-1);
  if (!last || !TIME_RE.test(last.start) || !END_TIME_RE.test(last.end)) return null;
  // 上一堂已排到 24:00，沒有下一堂的開始時間可接
  if (minutesOf(last.end) >= END_OF_DAY) return null;
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
    if (!TIME_RE.test(start) || !END_TIME_RE.test(end)) return `${label}的時間格式不正確`;
    if (minutesOf(end) <= minutesOf(start)) return `${label}的結束時間需晚於開始時間`;
    if (i > 0 && minutesOf(start) < minutesOf(slots[i - 1].end)) return `${label}與第 ${i} 堂時間重疊`;
  }
  return null;
}

// ---------- 課程 QA ----------

/** 表單預設顯示三則空白的 QA（問題欄以提示文字顯示範本問題，見 QaEditor） */
export function blankQaItems(): CourseQaItem[] {
  return QA_TEMPLATE_QUESTIONS.map(() => ({ q: "", a: "" }));
}

export function serializeQa(items: CourseQaItem[]): string {
  return JSON.stringify(items);
}

/** 解析表單送來的 JSON；格式不對回傳 null（交給驗證報錯），空字串視為沒有任何一則。不去掉空白項目，編輯畫面要用 */
export function parseQa(raw: string): CourseQaItem[] | null {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return null;
    const items = value.map((item) =>
      item && typeof item === "object"
        ? { q: String((item as CourseQaItem).q ?? ""), a: String((item as CourseQaItem).a ?? "") }
        : null
    );
    return items.every(Boolean) ? (items as CourseQaItem[]) : null;
  } catch {
    return null;
  }
}

/** 只留問題與回答都有填的項目（PRD v4.7：問題或回答未填寫的 QA 不會儲存） */
export function filledQaItems(items: CourseQaItem[]): CourseQaItem[] {
  return items
    .map((item) => ({ q: item.q.trim(), a: item.a.trim() }))
    .filter((item) => item.q !== "" && item.a !== "");
}

/** 課程須知的字數檢查（選填，空白不檢查）；沒問題回傳 null */
export function validateNotes(notes: string): string | null {
  return charLength(notes.trim()) > NOTES_MAX ? `課程須知最多 ${NOTES_MAX} 個字` : null;
}

/** QA 的錯誤訊息；沒問題回傳 null。只檢查有填的項目，空白項目會被略過不存 */
export function validateQa(items: CourseQaItem[]): string | null {
  const filled = filledQaItems(items);
  if (filled.length > MAX_QA_ITEMS) return `課程 QA 最多 ${MAX_QA_ITEMS} 則`;
  for (const [i, item] of filled.entries()) {
    if (charLength(item.q) > QA_QUESTION_MAX) return `第 ${i + 1} 則的問題最多 ${QA_QUESTION_MAX} 個字`;
    if (charLength(item.a) > QA_ANSWER_MAX) return `第 ${i + 1} 則的回答最多 ${QA_ANSWER_MAX} 個字`;
    if (containsContactInfo(item.q) || containsContactInfo(item.a)) return CONTACT_INFO_MESSAGE;
  }
  return null;
}

// ---------- 地址（縣市＋行政區＋街道組成完整地址） ----------

// districts 用「台」，使用者貼上的地址可能是「臺」，比對前統一
const normalizeTai = (s: string) => s.replace(/臺/g, "台");

/**
 * 組成存進資料庫的完整地址：縣市＋行政區＋街道。街道欄已經自己帶了縣市行政區開頭時不重複加；
 * 還沒選行政區或街道是空的，回傳空字串（交給必填檢查）。
 */
export function composeAddress(city: string, district: string, street: string): string {
  const s = street.trim();
  if (!city || !district || !s) return "";
  const prefix = `${city}${district}`;
  return normalizeTai(s).startsWith(prefix) ? s : `${prefix}${s}`;
}

/** 編輯時把完整地址還原成街道欄：去掉開頭的縣市行政區；對不上就整串放進街道欄 */
export function stripAddressPrefix(address: string, city: string, district: string): string {
  if (!city || !district) return address;
  const prefix = `${city}${district}`;
  return normalizeTai(address).startsWith(prefix) ? address.slice(prefix.length) : address;
}

// ---------- 範本名稱 ----------

/** 範本名稱：選填，有填就是 2–40 字；回傳 { name, error }，沒填 name 為 null（畫面沿用課程名稱） */
export function validateTemplateName(raw: string): { name: string | null; error?: string } {
  const name = raw.trim();
  if (name === "") return { name: null };
  const length = charLength(name);
  if (length < TEMPLATE_NAME_MIN || length > TEMPLATE_NAME_MAX) {
    return { name: null, error: `範本名稱需為 ${TEMPLATE_NAME_MIN}–${TEMPLATE_NAME_MAX} 個字` };
  }
  return { name };
}

// ---------- 表單值 ----------

export function emptyCourseFormValues(): CourseFormValues {
  const values = Object.fromEntries(COURSE_FIELDS.map((f) => [f, ""])) as CourseFormValues;
  values.level = "unlimited";
  values.registration_deadline_hours = String(DEFAULT_DEADLINE_HOURS);
  values.session_slots = serializeSlots([{ start: "", end: "" }]);
  values.qa = serializeQa(blankQaItems());
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
    if (f === "session_slots" || f === "qa") continue;
    const v = course[f];
    if (v !== null && v !== undefined) values[f] = String(v);
  }
  values.session_slots = serializeSlots(slotsFromCourse(course));
  // 沒有 QA 的課程（含舊資料）顯示預設的三則空白，讓教練知道可以填
  values.qa = serializeQa(course.qa?.length ? course.qa : blankQaItems());
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

  // 前端直接拿表單的原始值來驗證（不像 server 端已經 trim 過），所以這裡一律先 trim：全空格視同沒填
  const title = values.title.trim();
  const locationName = values.location_name.trim();
  const locationAddress = values.location_address.trim();
  const description = values.description.trim();
  const notes = values.notes.trim();

  for (const f of REQUIRED_FIELDS) {
    if (f !== "session_slots" && !values[f].trim()) errors[f] = "此欄位為必填";
  }

  for (const f of PUBLIC_TEXT_FIELDS) {
    if (!errors[f] && containsContactInfo(values[f])) errors[f] = CONTACT_INFO_MESSAGE;
  }

  if (!errors.title && (charLength(title) < TITLE_MIN || charLength(title) > TITLE_MAX)) {
    errors.title = `課程名稱需為 ${TITLE_MIN}–${TITLE_MAX} 個字`;
  }
  if (!errors.location_name && (charLength(locationName) < LOCATION_NAME_MIN || charLength(locationName) > LOCATION_NAME_MAX)) {
    errors.location_name = `場館名稱需為 ${LOCATION_NAME_MIN}–${LOCATION_NAME_MAX} 個字`;
  }
  if (!errors.description && (charLength(description) < DESCRIPTION_MIN || charLength(description) > DESCRIPTION_MAX)) {
    errors.description = `課程介紹需為 ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} 個字`;
  }

  const notesError = validateNotes(notes);
  if (!errors.notes && notesError) errors.notes = notesError;

  const qaItems = parseQa(values.qa);
  const qaError = qaItems ? validateQa(qaItems) : "課程 QA 格式不正確";
  if (qaError) errors.qa = qaError;

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

  const slots = parseSlots(values.session_slots);
  const slotError = slots ? validateSlots(slots) : "場次時間格式不正確";
  if (slotError) errors.session_slots = slotError;

  // 每人費用：NT$ 整數，最低 200（PRD v4.7，不提供 0 元課程）
  const priceRaw = values.price_per_person.trim();
  const price = toInt(priceRaw);
  if (priceRaw && price === null) errors.price_per_person = "請輸入整數金額";
  else if (price !== null && price < MIN_PRICE) errors.price_per_person = `每人費用最低 NT$${MIN_PRICE}`;

  // 人數：正整數，上限最多 999（輸入框已擋掉小數點與負號，這裡是繞過前端時的第二道防線）
  const minRaw = values.min_participants.trim();
  const maxRaw = values.max_participants.trim();
  const min = toInt(minRaw);
  const max = toInt(maxRaw);
  if (minRaw && (min === null || min < 1)) errors.min_participants = "請輸入正整數，人數下限至少為 1";
  if (maxRaw && (max === null || max < 1)) errors.max_participants = "請輸入正整數，人數上限至少為 1";
  else if (max !== null && max > MAX_PARTICIPANTS_CAP) errors.max_participants = `人數上限最多 ${MAX_PARTICIPANTS_CAP}`;
  if (!errors.max_participants && min !== null && max !== null && min >= 1 && max < min) {
    errors.max_participants = "人數上限不可低於人數下限";
  }
  if (!errors.min_participants && min !== null && min > MAX_PARTICIPANTS_CAP) {
    errors.min_participants = `人數下限最多 ${MAX_PARTICIPANTS_CAP}`;
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
    title,
    sport_type: values.sport_type,
    level: level as CourseLevel,
    location_name: locationName,
    location_address: locationAddress,
    district_id: districtId!,
    session_date: values.session_date,
    session_slots: cleanSlots(slots),
    time_range_start: first.start,
    time_range_end: slots.at(-1)!.end,
    session_duration_minutes: minutesOf(first.end) - minutesOf(first.start),
    price_per_person: price!,
    min_participants: min!,
    max_participants: max!,
    registration_deadline_hours: deadlineHours!,
    description,
    notes: notes || null,
    qa: filledQaItems(qaItems!),
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
