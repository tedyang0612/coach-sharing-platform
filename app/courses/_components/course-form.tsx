"use client";

// 開課／編輯課程表單（PRD 1.0）。
// - 必填欄位齊全、且沒有驗證錯誤前，發布按鈕維持 disabled（AC1：不是送出後才報錯）
// - 公開欄位即時檢查聯絡資訊（規格5）
// - 依時間區間＋每堂長度即時預覽場次（規格2）；預覽只顯示「14:00–15:00」，不顯示時長
// - 編輯且已有人報名（locked）：只能改課程須知與封面圖，其他欄位 disabled

import { useActionState, useState } from "react";
import { SPORT_TYPES } from "@/types/database";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import type { CourseFormState } from "../actions";
import {
  ALWAYS_EDITABLE_FIELDS,
  COURSE_LEVELS,
  DEFAULT_DEADLINE_HOURS,
  SCHEDULE_FIELDS,
  computeLeftover,
  computeSessionSlots,
  hasAllRequiredFields,
  validateCourseValues,
  type CourseField,
  type CourseFieldErrors,
  type CourseFormValues,
} from "../_lib/course-input";
import { formatTimeRange } from "../_lib/format";
import { CoverPicker } from "./cover-picker";
import { FormSection, SelectField, TextAreaField } from "./fields";

type CourseAction = (prev: CourseFormState, formData: FormData) => Promise<CourseFormState>;

type Props = {
  action: CourseAction;
  initialValues: CourseFormValues;
  mode: "create" | "edit";
  /** 從範本／複製建立時的來源課程 id（記錄到 template_source_id） */
  sourceId?: string;
  /** 編輯時的課程 id */
  courseId?: string;
  /** 編輯範本（不產生場次，不需要未來日期） */
  isTemplate?: boolean;
  /** 已有人報名：只能改課程須知與封面圖 */
  locked?: boolean;
};

const DURATION_OPTIONS = [30, 45, 60, 90, 120, 150, 180];
const DEADLINE_OPTIONS = [24, 36, 48, 72];

// 時間用下拉選單、24 小時制、每 30 分鐘一格：原生 <input type="time"> 依系統語系顯示上午／下午，
// 捲動時不會自動切換，而且要點到時鐘圖示才開得了，教練回饋不直覺。
const TIME_STEP_MINUTES = 30;
const FIRST_SLOT = 6 * 60; // 06:00
const LAST_SLOT = 23 * 60; // 23:00
const TIME_GROUPS: { label: string; from: number; to: number }[] = [
  { label: "上午", from: 0, to: 12 * 60 },
  { label: "下午", from: 12 * 60, to: 18 * 60 },
  { label: "晚上", from: 18 * 60, to: 24 * 60 },
];

function toHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

const TIME_SLOTS: string[] = [];
for (let m = FIRST_SLOT; m <= LAST_SLOT; m += TIME_STEP_MINUTES) TIME_SLOTS.push(toHHMM(m));

/** 時間選項；after 有值時只列出晚於它的時間（結束時間用）。舊資料不在格點上的值也保留，避免編輯時被清掉 */
function TimeOptions({ after, current }: { after?: string; current: string }) {
  const slots = current && !TIME_SLOTS.includes(current) ? [...TIME_SLOTS, current].sort() : TIME_SLOTS;
  const visible = after ? slots.filter((t) => t > after) : slots;
  return (
    <>
      <option value="" disabled>
        請選擇
      </option>
      {TIME_GROUPS.map((g) => {
        const items = visible.filter((t) => {
          const [h, m] = t.split(":").map(Number);
          return h * 60 + m >= g.from && h * 60 + m < g.to;
        });
        return items.length === 0 ? null : (
          <optgroup key={g.label} label={g.label}>
            {items.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}

/** 點日期欄位任何地方都打開日曆（原生只有點到圖示才會開）；不支援 showPicker 的瀏覽器維持原本行為 */
function openDatePicker(e: { currentTarget: HTMLInputElement }) {
  try {
    e.currentTarget.showPicker?.();
  } catch {
    // 部分瀏覽器在非使用者手勢或 iframe 內會丟錯，忽略即可
  }
}

const initialState: CourseFormState = {};

function todayInTaipei(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
}

export function CourseForm({ action, initialValues, mode, sourceId, courseId, isTemplate = false, locked = false }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState<Partial<Record<CourseField, boolean>>>({});
  const [coverUploading, setCoverUploading] = useState(false);

  // 送出後才回來的 server 錯誤：使用者改了那個欄位就不再顯示舊錯誤
  const [seenState, setSeenState] = useState(state);
  const [editedSinceSubmit, setEditedSinceSubmit] = useState<Set<CourseField>>(new Set());
  if (state !== seenState) {
    setSeenState(state);
    setEditedSinceSubmit(new Set());
  }

  const isEditable = (f: CourseField) => !locked || ALWAYS_EDITABLE_FIELDS.includes(f);

  function set(field: CourseField, value: string) {
    setValues((v) => {
      const next = { ...v, [field]: value };
      // 開始時間改到結束時間之後：結束時間已不在選項裡，直接清掉讓教練重選
      if (field === "time_range_start" && next.time_range_end && next.time_range_end <= value) next.time_range_end = "";
      return next;
    });
    setEditedSinceSubmit((s) => (s.has(field) ? s : new Set(s).add(field)));
  }

  // 只有新開課，或編輯時真的改到日期／時段，才要求報名截止還沒過（舊課程的過去日期不擋其他欄位的修改）
  const scheduleChanged = SCHEDULE_FIELDS.some((f) => values[f] !== initialValues[f]);
  const needsFutureDate = !isTemplate && (mode === "create" || scheduleChanged);

  const publishCheck = validateCourseValues(values, { requireFutureDeadline: needsFutureDate });
  const templateCheck = validateCourseValues(values, { requireFutureDeadline: false });
  const clientErrors: CourseFieldErrors = publishCheck.errors ?? {};

  const lockedErrors = ALWAYS_EDITABLE_FIELDS.some((f) => clientErrors[f]);
  const ready = hasAllRequiredFields(values) && !coverUploading && !pending;
  const canPublish = locked ? !lockedErrors && !coverUploading && !pending : ready && !publishCheck.errors;
  const canSaveTemplate = ready && !templateCheck.errors;

  function errorFor(f: CourseField): string | undefined {
    const server = state.errors?.[f];
    if (server && !editedSinceSubmit.has(f)) return server;
    return touched[f] || (values[f] !== "" && clientErrors[f] !== "此欄位為必填") ? clientErrors[f] : undefined;
  }

  // 場次預覽：時間欄位都合法才算
  const preview =
    !clientErrors.session_date && !clientErrors.time_range_start && !clientErrors.time_range_end &&
    !clientErrors.session_duration_minutes && values.session_date && values.time_range_start &&
    values.time_range_end && values.session_duration_minutes
      ? computeSessionSlots({
          session_date: values.session_date,
          time_range_start: values.time_range_start,
          time_range_end: values.time_range_end,
          session_duration_minutes: Number(values.session_duration_minutes),
          registration_deadline_hours: Number(values.registration_deadline_hours || DEFAULT_DEADLINE_HOURS),
        })
      : [];

  const leftover =
    preview.length > 0
      ? computeLeftover({
          time_range_start: values.time_range_start,
          time_range_end: values.time_range_end,
          session_duration_minutes: Number(values.session_duration_minutes),
        })
      : null;

  const fieldProps = (f: CourseField) => ({
    name: f,
    value: values[f],
    disabled: !isEditable(f),
    error: errorFor(f),
    onChange: (e: { target: { value: string } }) => set(f, e.target.value),
  });

  const primaryLabel = mode === "edit" ? "儲存變更" : "發布課程";

  return (
    <form
      action={formAction}
      onBlur={(e) => {
        // blur 從各個欄位冒泡上來，target 是實際失焦的 input／select／textarea
        const name = (e.target as EventTarget & { name?: string }).name as CourseField | undefined;
        if (name) setTouched((t) => (t[name] ? t : { ...t, [name]: true }));
      }}
      className="flex flex-col gap-5"
    >
      {sourceId && <input type="hidden" name="sourceId" value={sourceId} />}
      {courseId && <input type="hidden" name="courseId" value={courseId} />}

      {locked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          已有學員報名，時段、地點、價格與人數已鎖定，目前只能修改課程須知與封面圖。
        </div>
      )}

      <FormSection title="基本資訊">
        <TextField label="課程名稱 *" placeholder="例如：零基礎重訓入門｜深蹲與硬舉" maxLength={60} {...fieldProps("title")} />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="運動項目 *" {...fieldProps("sport_type")}>
            <option value="" disabled>
              請選擇
            </option>
            {SPORT_TYPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>

          <SelectField label="運動程度" {...fieldProps("level")}>
            {COURSE_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </SelectField>
        </div>

        <CoverPicker
          value={values.cover_image_url}
          sportType={values.sport_type}
          onChange={(url) => set("cover_image_url", url)}
          onUploadingChange={setCoverUploading}
          error={errorFor("cover_image_url")}
        />
      </FormSection>

      <FormSection title="時間與地點" description="系統會依開始／結束時間與每堂長度，自動產生固定場次，每個場次各自計算名額與成團。">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="場館名稱 *" placeholder="例如：XX 運動中心 3F 重訓區" {...fieldProps("location_name")} />
          <TextField label="地址 *" placeholder="供學員以 Google Map 定位" {...fieldProps("location_address")} />
        </div>

        <TextField
          label="上課日期 *"
          type="date"
          min={mode === "create" ? todayInTaipei() : undefined}
          onClick={openDatePicker}
          {...fieldProps("session_date")}
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <SelectField label="開始時間 *" {...fieldProps("time_range_start")}>
            <TimeOptions current={values.time_range_start} />
          </SelectField>
          <SelectField label="結束時間 *" {...fieldProps("time_range_end")}>
            <TimeOptions current={values.time_range_end} after={values.time_range_start || undefined} />
          </SelectField>
          <div className="col-span-2 sm:col-span-1">
            <SelectField label="每堂長度 *" {...fieldProps("session_duration_minutes")}>
              <option value="" disabled>
                請選擇
              </option>
              {DURATION_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} 分鐘
                </option>
              ))}
            </SelectField>
          </div>
        </div>

        {preview.length > 0 && (
          <div className="rounded-xl bg-brand-ink/60 px-4 py-3">
            <p className="text-xs font-semibold text-brand">
              將產生 {preview.length} 個場次：{preview.map((slot) => formatTimeRange(slot.startAt, slot.endAt)).join("、")}
            </p>
            {leftover && (
              <p className="mt-1.5 text-xs text-amber-700">
                {leftover.start}–{leftover.end}（{leftover.minutes} 分鐘）不足一堂課，不會產生場次。可調整時間區間或每堂長度。
              </p>
            )}
          </div>
        )}

        <SelectField
          label="報名截止"
          hint="截止時尚未達人數下限的場次會自動取消，不會扣款"
          {...fieldProps("registration_deadline_hours")}
        >
          {DEADLINE_OPTIONS.map((h) => (
            <option key={h} value={h}>
              開課前 {h} 小時{h === DEFAULT_DEADLINE_HOURS ? "（預設）" : ""}
            </option>
          ))}
        </SelectField>
      </FormSection>

      <FormSection title="費用與人數" description="每個場次各自計算，人數上下限適用於每一個場次。">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="每人費用（NT$）*" type="number" inputMode="numeric" min={0} step={1} placeholder="800" {...fieldProps("price_per_person")} />
          <TextField label="人數下限 *" type="number" inputMode="numeric" min={1} step={1} placeholder="2" {...fieldProps("min_participants")} />
          <TextField label="人數上限 *" type="number" inputMode="numeric" min={1} step={1} placeholder="6" {...fieldProps("max_participants")} />
        </div>
      </FormSection>

      <FormSection title="課程內容" description="為保障雙方交易安全，請勿於公開欄位填寫電話、LINE、Email 或外部連結。">
        <TextAreaField label="課程介紹" placeholder="課程內容、適合對象、教學方式…" {...fieldProps("description")} />
        <TextAreaField label="課程須知" placeholder="穿著、需自備的裝備、集合地點等" {...fieldProps("notes")} />
      </FormSection>

      {state.errors?.form && <FormError message={state.errors.form} />}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {mode === "create" && (
          <button
            type="submit"
            name="intent"
            value="template"
            disabled={!canSaveTemplate}
            className="rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            存成範本
          </button>
        )}
        <Button type="submit" name="intent" value="publish" disabled={!canPublish} className="sm:w-auto sm:px-8">
          {pending ? "處理中…" : primaryLabel}
        </Button>
      </div>
    </form>
  );
}
