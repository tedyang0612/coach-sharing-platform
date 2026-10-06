"use client";

// 開課／編輯課程表單（PRD 1.0）。
// - 必填欄位齊全、且沒有驗證錯誤前，發布按鈕維持 disabled（AC1：不是送出後才報錯）
// - 公開欄位即時檢查聯絡資訊（規格5）
// - 場次時間逐堂設定（10/3 組員討論）：第一堂手動選開始／結束，「＋ 新增一堂」接續上一堂並沿用時長
// - 縣市／行政區／街道同一行（1:1:2），送出時組成完整地址存進 location_address
// - 課程 QA（PRD v4.7 規格 9）；建立課程時可同時存成範本並自訂範本名稱
// - 編輯且已有人報名（locked）：只能改課程須知、課程 QA 與封面圖，其他欄位 disabled

import { useActionState, useState } from "react";
import { SPORT_TYPES, type District } from "@/types/database";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import type { CourseFormState } from "../actions";
import {
  COURSE_LEVELS,
  DEADLINE_OPTIONS,
  DEFAULT_DEADLINE_HOURS,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  LOCATION_NAME_MAX,
  LOCKED_EDITABLE_FIELDS,
  MAX_PARTICIPANTS_CAP,
  MIN_PRICE,
  SCHEDULE_FIELDS,
  TEMPLATE_NAME_MAX,
  TITLE_MAX,
  charLength,
  composeAddress,
  hasAllRequiredFields,
  parseQa,
  parseSlots,
  serializeQa,
  serializeSlots,
  stripAddressPrefix,
  validateCourseValues,
  validateTemplateName,
  type CourseField,
  type CourseFieldErrors,
  type CourseFormValues,
} from "../_lib/course-input";
import { changedSlotsDeadlineError } from "../_lib/slot-sync";
import { CoverPicker } from "./cover-picker";
import { FormSection, SelectField, TextAreaField } from "./fields";
import { QaEditor } from "./qa-editor";
import { SlotsEditor } from "./slots-editor";

type CourseAction = (prev: CourseFormState, formData: FormData) => Promise<CourseFormState>;

type Props = {
  action: CourseAction;
  initialValues: CourseFormValues;
  /** 縣市／行政區清單（districts 表，已依 sort_order 排序） */
  districts: District[];
  mode: "create" | "edit";
  /** 從範本／複製建立時的來源課程 id（記錄到 template_source_id） */
  sourceId?: string;
  /** 編輯時的課程 id */
  courseId?: string;
  /** 編輯範本（不產生場次，不需要未來日期） */
  isTemplate?: boolean;
  /** 編輯範本時帶入目前的範本名稱 */
  initialTemplateName?: string;
  /** 已有人報名：只能改課程須知、課程 QA 與封面圖 */
  locked?: boolean;
};

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

export function CourseForm({
  action,
  initialValues,
  districts,
  mode,
  sourceId,
  courseId,
  isTemplate = false,
  initialTemplateName = "",
  locked = false,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState(initialValues);

  // 縣市只是行政區的篩選用下拉，不送出；送出的是 district_id（縣市由它反查）。
  // 地址欄只填街道，送出前組成「縣市＋行政區＋街道」寫進 location_address（hidden input）
  const initialDistrict = districts.find((d) => String(d.id) === initialValues.district_id);
  const [city, setCity] = useState(initialDistrict?.city ?? "");
  const [street, setStreet] = useState(() =>
    stripAddressPrefix(initialValues.location_address, initialDistrict?.city ?? "", initialDistrict?.district ?? "")
  );
  const cities = [...new Set(districts.map((d) => d.city))];
  const cityDistricts = districts.filter((d) => d.city === city);

  const [alsoTemplate, setAlsoTemplate] = useState(false);
  const [templateName, setTemplateName] = useState(initialTemplateName);
  const [touched, setTouched] = useState<Partial<Record<CourseField, boolean>>>({});
  const [coverUploading, setCoverUploading] = useState(false);

  // 送出後才回來的 server 錯誤：使用者改了那個欄位就不再顯示舊錯誤
  const [seenState, setSeenState] = useState(state);
  const [editedSinceSubmit, setEditedSinceSubmit] = useState<Set<string>>(new Set());
  if (state !== seenState) {
    setSeenState(state);
    setEditedSinceSubmit(new Set());
  }

  // 有人報名後：只有公告、QA、封面圖，以及場次時間表（沒有人報名的場次仍可調整，有人報名的那一堂由 SlotsEditor 與 server 各自擋）可以改
  const isEditable = (f: CourseField) => !locked || LOCKED_EDITABLE_FIELDS.includes(f);

  function markEdited(field: string) {
    setEditedSinceSubmit((s) => (s.has(field) ? s : new Set(s).add(field)));
  }

  function set(field: CourseField, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    markEdited(field);
  }

  /** 縣市、行政區或街道有變動時重新組出完整地址；行政區還沒選或街道空白時完整地址為空字串 */
  function syncAddress(nextDistrictId: string, nextStreet: string) {
    const d = districts.find((x) => String(x.id) === nextDistrictId);
    set("location_address", d ? composeAddress(d.city, d.district, nextStreet) : "");
  }

  // 只有新開課，或編輯時真的改到日期／時段，才要求報名截止還沒過（舊課程的過去日期不擋其他欄位的修改）
  const scheduleChanged = SCHEDULE_FIELDS.some((f) => values[f] !== initialValues[f]);
  // 已有人報名時不要求第一堂的截止時間還沒過（那一堂可能已經鎖定、截止），只檢查新增或改過的那幾堂（見 deadlineError）
  const needsFutureDate = !isTemplate && !locked && (mode === "create" || scheduleChanged);

  const publishCheck = validateCourseValues(values, { requireFutureDeadline: needsFutureDate });
  const templateCheck = validateCourseValues(values, { requireFutureDeadline: false });
  const clientErrors: CourseFieldErrors = publishCheck.errors ?? {};

  // 範本名稱：建立時（勾選同時存範本、或只存範本）與編輯範本時才會用到
  const templateNameError = validateTemplateName(templateName).error;
  const templateNameServerError = state.errors?.template_name && !editedSinceSubmit.has("template_name") ? state.errors.template_name : undefined;

  const slotsNow = parseSlots(values.session_slots) ?? [];
  const deadlineError = locked
    ? changedSlotsDeadlineError({
        date: values.session_date,
        deadlineHours: Number(values.registration_deadline_hours || DEFAULT_DEADLINE_HOURS),
        slots: slotsNow,
        initialSlots: parseSlots(initialValues.session_slots) ?? [],
      })
    : null;
  const lockedErrors = LOCKED_EDITABLE_FIELDS.some((f) => clientErrors[f]) || !!deadlineError;
  const ready = hasAllRequiredFields(values) && !coverUploading && !pending;
  const canPublish = locked
    ? !lockedErrors && !coverUploading && !pending
    : ready && !publishCheck.errors && !(mode === "create" && alsoTemplate && templateNameError) && !(isTemplate && templateNameError);
  const canSaveTemplate = ready && !templateCheck.errors && !templateNameError;

  function errorFor(f: CourseField): string | undefined {
    const server = state.errors?.[f];
    if (server && !editedSinceSubmit.has(f)) return server;
    // 課程介紹的字數下限：還沒離開欄位前不提示，避免一開始輸入就一直出現紅字
    if (f === "description" && !touched.description) return undefined;
    return touched[f] || (values[f] !== "" && clientErrors[f] !== "此欄位為必填") ? clientErrors[f] : undefined;
  }

  const slots = parseSlots(values.session_slots) ?? [];
  // 時間表的錯誤：「還沒填完」由 disabled 的按鈕表達，不另外顯示；填完後才顯示重疊等錯誤
  const slotsFilled = slots.length > 0 && slots.every((sl) => sl.start && sl.end);
  const slotsServerError = state.errors?.session_slots && !editedSinceSubmit.has("session_slots") ? state.errors.session_slots : undefined;
  const slotsError = slotsServerError ?? (slotsFilled ? clientErrors.session_slots ?? deadlineError ?? undefined : undefined);

  const qaItems = parseQa(values.qa) ?? [];
  const qaError = (state.errors?.qa && !editedSinceSubmit.has("qa") ? state.errors.qa : undefined) ?? clientErrors.qa;

  const fieldProps = (f: CourseField) => ({
    name: f,
    value: values[f],
    disabled: !isEditable(f),
    error: errorFor(f),
    onChange: (e: { target: { value: string } }) => set(f, e.target.value),
  });

  // 數字欄位只收數字：打不出小數點、負號與 e，貼上的內容也會被濾掉（鯨魚 QA：直接鎖定正整數）
  const numberProps = (f: CourseField, maxLength: number) => ({
    ...fieldProps(f),
    type: "text" as const,
    inputMode: "numeric" as const,
    pattern: "[0-9]*",
    maxLength,
    onChange: (e: { target: { value: string } }) => set(f, e.target.value.replace(/\D/g, "")),
  });

  const deadlineOptions = DEADLINE_OPTIONS.includes(Number(values.registration_deadline_hours))
    ? DEADLINE_OPTIONS
    : [...DEADLINE_OPTIONS, Number(values.registration_deadline_hours)].sort((a, b) => a - b);

  const primaryLabel = mode === "edit" ? "儲存變更" : "發布課程";
  const showTemplateName = (mode === "create") || (mode === "edit" && isTemplate && !locked);

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
          已有學員報名：課程的名稱、運動、程度、地點、價格、人數、報名截止與介紹已鎖定，只能修改課程須知、課程 QA 與封面圖。場次時間依各場次判斷：沒有人報名的場次仍可調整時間、刪除或新增，有人報名的場次時間無法修改。要使用不同的地點或價格，請另外建立課程或複製課程。
        </div>
      )}

      <FormSection title="基本資訊">
        <TextField
          label="課程名稱 *"
          placeholder="例如：零基礎重訓入門｜深蹲與硬舉"
          maxLength={TITLE_MAX}
          {...fieldProps("title")}
        />

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

      <FormSection title="時間與地點" description="一堂課就是一個場次，學員以場次為單位報名，人數也各場次分開計算。">
        {/* 縣市：行政區：街道 = 1:1:2，地址可以直接對照選單輸入 */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SelectField
            label="縣市 *"
            id="course-city"
            value={city}
            disabled={!isEditable("district_id")}
            onChange={(e) => {
              setCity(e.target.value);
              set("district_id", ""); // 換縣市後原本的行政區不再適用，清掉讓教練重選
              syncAddress("", street);
            }}
          >
            <option value="" disabled>
              請選擇
            </option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="行政區 *"
            {...fieldProps("district_id")}
            disabled={!isEditable("district_id") || !city}
            onChange={(e) => {
              set("district_id", e.target.value);
              syncAddress(e.target.value, street);
            }}
          >
            <option value="" disabled>
              {city ? "請選擇" : "請先選擇縣市"}
            </option>
            {cityDistricts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.district}
              </option>
            ))}
          </SelectField>
          <div className="col-span-2">
            <TextField
              label="地址 *"
              name="location_street"
              placeholder="例如：忠孝東路四段 1 號 3 樓"
              value={street}
              disabled={!isEditable("location_address")}
              error={errorFor("location_address")}
              onChange={(e) => {
                setStreet(e.target.value);
                syncAddress(values.district_id, e.target.value);
              }}
              onBlur={() => setTouched((t) => (t.location_address ? t : { ...t, location_address: true }))}
            />
            <input type="hidden" name="location_address" value={values.location_address} />
          </div>
        </div>

        <TextField
          label="場館名稱 *"
          placeholder="例如：XX 運動中心 3F 重訓區"
          maxLength={LOCATION_NAME_MAX}
          {...fieldProps("location_name")}
        />

        <TextField
          label="上課日期 *"
          type="date"
          min={mode === "create" ? todayInTaipei() : undefined}
          onClick={openDatePicker}
          {...fieldProps("session_date")}
        />

        <SlotsEditor
          slots={slots}
          onChange={(next) => set("session_slots", serializeSlots(next))}
          disabled={!isEditable("session_slots")}
          error={slotsError}
        />

        <SelectField
          label="報名截止"
          hint="報名截止時會確認是否開課：人數達下限就確定開課，未達下限則自動取消。"
          {...fieldProps("registration_deadline_hours")}
        >
          {deadlineOptions.map((h) => (
            <option key={h} value={h}>
              開課前 {h} 小時{h === DEFAULT_DEADLINE_HOURS ? "（預設）" : ""}
            </option>
          ))}
        </SelectField>
      </FormSection>

      <FormSection title="費用與人數" description="人數上下限適用於每一個場次。">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label={`每人費用（NT$，最低 ${MIN_PRICE}）*`} placeholder="800" {...numberProps("price_per_person", 6)} />
          <TextField label="人數下限 *" placeholder="2" {...numberProps("min_participants", 3)} />
          <TextField label={`人數上限（最多 ${MAX_PARTICIPANTS_CAP}）*`} placeholder="6" {...numberProps("max_participants", 3)} />
        </div>
      </FormSection>

      <FormSection title="課程內容" description="為保障雙方交易安全，請勿於公開欄位填寫電話、LINE、Email 或外部連結。">
        <TextAreaField
          label="課程介紹 *"
          placeholder="課程內容、適合對象、教學方式…"
          maxLength={DESCRIPTION_MAX}
          hint={`${charLength(values.description.trim())}／${DESCRIPTION_MAX} 字（至少 ${DESCRIPTION_MIN} 字）`}
          {...fieldProps("description")}
        />
        <TextAreaField label="課程須知" placeholder="穿著、需自備的裝備、集合地點等" {...fieldProps("notes")} />
      </FormSection>

      <FormSection title="課程 QA（選填）" description="預先回答學員常問的問題，會以摺疊方式顯示在課程頁。">
        <QaEditor
          items={qaItems}
          onChange={(next) => set("qa", serializeQa(next))}
          disabled={!isEditable("qa")}
          error={qaError}
        />
      </FormSection>

      {showTemplateName && (
        <FormSection
          title={mode === "create" ? "範本" : "範本名稱"}
          description={
            mode === "create"
              ? "範本只存這份設定，不公開、不產生場次，下次可以一鍵帶入再選新的日期。"
              : undefined
          }
        >
          {mode === "create" && (
            <label className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
              <input
                type="checkbox"
                name="also_template"
                value="on"
                checked={alsoTemplate}
                onChange={(e) => setAlsoTemplate(e.target.checked)}
                className="h-4 w-4 accent-brand"
              />
              發布的同時存成範本
            </label>
          )}
          <TextField
            label="範本名稱（選填）"
            name="template_name"
            placeholder="例如：【台北】周二晚間基礎瑜珈"
            maxLength={TEMPLATE_NAME_MAX}
            value={templateName}
            error={templateNameServerError ?? templateNameError}
            onChange={(e) => {
              setTemplateName(e.target.value);
              markEdited("template_name");
            }}
          />
          <p className="-mt-2 text-xs text-neutral-500">未填寫時，範本沿用課程名稱。</p>
        </FormSection>
      )}

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
            只存成範本（不發布）
          </button>
        )}
        <Button type="submit" name="intent" value="publish" disabled={!canPublish} className="sm:w-auto sm:px-8">
          {pending ? "處理中…" : primaryLabel}
        </Button>
      </div>
    </form>
  );
}
