"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitCoachApplication } from "@/app/actions/coach-application";
import {
  EducationList,
  type EducationDraft,
} from "@/components/coach-application/education-list";
import { FileField } from "@/components/coach-application/file-field";
import {
  LicenseList,
  type LicenseDraft,
} from "@/components/coach-application/license-list";
import { SportPicker } from "@/components/coach-application/sport-picker";
import { TagInput } from "@/components/coach-application/tag-input";
import { TextAreaField } from "@/components/coach-application/text-area-field";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import type { LicenseStatus } from "@/types/database";
import {
  CONSENT_CHECKBOX_LABEL,
  CONSENT_INTRO,
  CONSENT_ITEMS,
} from "@/lib/coach-application/consent";
import {
  COACH_DOCUMENT_BUCKET,
  COACH_PHOTO_BUCKET,
} from "@/lib/coach-application/constants";
import { DEFAULT_EDUCATION_DEGREE, parseEducation } from "@/lib/coach-application/education";
import { uploadCoachFile } from "@/lib/coach-application/upload";
import {
  contactInfoWarning,
  hasErrors,
  validateCoachApplication,
  type CoachApplicationErrors,
} from "@/lib/coach-application/validation";

// 補件／未通過後重新送審時，帶入先前填寫的內容（由 page.tsx 從資料庫讀出）
export type ExistingApplication = {
  status: "needs_more_info" | "rejected";
  rejectionReason: string | null;
  photoUrl: string;
  // 良民證原檔審核完 7 天會被清掉，清掉後要重新上傳
  hasCriminalRecord: boolean;
  sportCategories: string[];
  tags: string[];
  bioEducation: string;
  bioCompetition: string;
  bioIntro: string;
  contactPhone: string;
  contactLine: string;
  contactSocial: string;
  licenses: { id: string; name: string; status: LicenseStatus }[];
};

const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
  pending: "審核中",
  approved: "已通過",
  rejected: "未通過",
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-base font-bold text-neutral-900">{title}</h2>
        <p className="mt-1 text-xs text-neutral-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

type ApplicationFormProps = {
  userId: string;
  // 有值代表是補件／未通過後重新送審
  existing?: ExistingApplication;
};

export function ApplicationForm({ userId, existing }: ApplicationFormProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [sportCategories, setSportCategories] = useState<string[]>(
    existing?.sportCategories ?? []
  );
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  // 重新送審時把先前的學經歷還原成學歷清單與工作／教學經歷；第一次申請先給一列空白學歷
  const [previousEducation] = useState(() => parseEducation(existing?.bioEducation ?? ""));
  const [education, setEducation] = useState<EducationDraft[]>(() => {
    const { entries } = previousEducation;
    if (entries.length === 0) return [{ key: 1, degree: DEFAULT_EDUCATION_DEGREE, school: "" }];
    return entries.map((entry, index) => ({ key: index + 1, ...entry }));
  });
  const [workExperience, setWorkExperience] = useState(previousEducation.workExperience);
  const [bioCompetition, setBioCompetition] = useState(existing?.bioCompetition ?? "");
  const [bioIntro, setBioIntro] = useState(existing?.bioIntro ?? "");

  const [contactPhone, setContactPhone] = useState(existing?.contactPhone ?? "");
  const [contactLine, setContactLine] = useState(existing?.contactLine ?? "");
  const [contactSocial, setContactSocial] = useState(existing?.contactSocial ?? "");

  const [criminalRecord, setCriminalRecord] = useState<File | null>(null);
  const [licenses, setLicenses] = useState<LicenseDraft[]>([]);
  // 先前上傳、這次要移除的證照（已通過的不能移除）
  const [removedLicenseIds, setRemovedLicenseIds] = useState<string[]>([]);
  // 同意聲明每次送審都要重新勾選
  const [consent, setConsent] = useState(false);

  // 按過一次送出之後才顯示必填錯誤，之後每次修改都即時重新檢查
  const [attempted, setAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [isSubmitting, startSubmit] = useTransition();

  const validation = validateCoachApplication({
    hasPhoto: photo !== null || Boolean(existing?.photoUrl),
    hasCriminalRecord: criminalRecord !== null || Boolean(existing?.hasCriminalRecord),
    sportCategories,
    tags,
    education,
    workExperience,
    bioCompetition,
    bioIntro,
    contactPhone,
    contactLine,
    contactSocial,
    licenses: licenses.map((license) => ({
      name: license.name,
      hasFile: license.file !== null,
    })),
    consent,
  });
  const errors: CoachApplicationErrors = attempted ? validation : {};

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setSubmitError(undefined);
    if (hasErrors(validation)) return;

    startSubmit(async () => {
      try {
        // 先把檔案傳到 Storage，再把路徑連同其他欄位交給 Server Action 寫入資料庫。
        // 重新送審時沒有重選的檔案不用再傳，路徑留空代表沿用先前的檔案
        const photoPath = photo
          ? await uploadCoachFile(COACH_PHOTO_BUCKET, userId, "photo", photo)
          : "";
        const criminalRecordPath = criminalRecord
          ? await uploadCoachFile(COACH_DOCUMENT_BUCKET, userId, "criminal-record", criminalRecord)
          : "";
        const uploadedLicenses = [];
        for (const license of licenses) {
          // 檢查規則已確保每張證照都有檔案
          if (!license.file) continue;
          uploadedLicenses.push({
            name: license.name,
            filePath: await uploadCoachFile(COACH_DOCUMENT_BUCKET, userId, "license", license.file),
          });
        }

        // 成功時 Server Action 會直接導向申請狀態頁，只有失敗才會有回傳值
        const result = await submitCoachApplication({
          photoPath,
          criminalRecordPath,
          sportCategories,
          tags,
          education: education.map(({ degree, school }) => ({ degree, school })),
          workExperience,
          bioCompetition,
          bioIntro,
          contactPhone,
          contactLine,
          contactSocial,
          licenses: uploadedLicenses,
          removedLicenseIds,
          consent,
        });
        if (result?.error) setSubmitError(result.error);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "送出失敗，請稍後再試。");
      }
    });
  }

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
      {existing && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-800">
            {existing.status === "needs_more_info" ? "申請需要補件" : "上次申請未通過"}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-amber-900">
            {existing.rejectionReason ?? "管理員未填寫說明，請聯繫平台。"}
          </p>
          <p className="mt-2 text-xs text-amber-800">
            已帶入你先前填寫的內容，修改後送出就會重新進入審核。
          </p>
        </div>
      )}

      <Section
        title="個人檔案"
        description="審核通過後會公開顯示在你的教練個人檔案，請勿填寫電話、Email、LINE ID 或網址。"
      >
        <FileField
          label="個人照片＊"
          name="photo"
          kind="photo"
          file={photo}
          onChange={setPhoto}
          existing={
            existing?.photoUrl
              ? { label: "沿用先前上傳的照片", imageUrl: existing.photoUrl }
              : undefined
          }
          error={errors.photo}
        />

        <SportPicker
          value={sportCategories}
          onChange={setSportCategories}
          error={errors.sportCategories}
        />

        <TagInput value={tags} onChange={setTags} />

        {/* 公開欄位邊打字邊檢查聯絡資訊，偵測到就即時警示（PRD 第六章 7） */}
        <EducationList
          value={education}
          onChange={setEducation}
          error={errors.education}
          itemErrors={errors.educationItems}
        />

        <TextAreaField
          label="工作／教學經歷（選填）"
          name="workExperience"
          rows={3}
          placeholder="例：知名健身房 5 年教練經驗"
          value={workExperience}
          onChange={(event) => setWorkExperience(event.target.value)}
          error={contactInfoWarning(workExperience)}
        />

        <TextAreaField
          label="比賽經歷（選填）"
          name="bioCompetition"
          placeholder="例：2023 全國健美錦標賽 75kg 級第 3 名"
          value={bioCompetition}
          onChange={(event) => setBioCompetition(event.target.value)}
          error={contactInfoWarning(bioCompetition)}
        />

        <TextAreaField
          label="簡述＊"
          name="bioIntro"
          hint="用幾句話介紹你的教學專長與風格，讓學員認識你。"
          value={bioIntro}
          onChange={(event) => setBioIntro(event.target.value)}
          error={contactInfoWarning(bioIntro) ?? errors.bioIntro}
        />
      </Section>

      <Section
        title="聯絡方式"
        description="電話、LINE、社群帳號至少填寫一項。不會公開，僅供平台聯繫，以及場次成團後透過行前公告提供給該場次學員。Email 通知會寄到你註冊帳號的信箱，不用另外填寫。"
      >
        <TextField
          label="電話"
          name="contactPhone"
          type="tel"
          autoComplete="tel"
          placeholder="0912-345-678"
          value={contactPhone}
          onChange={(event) => setContactPhone(event.target.value)}
        />
        <TextField
          label="LINE ID"
          name="contactLine"
          value={contactLine}
          onChange={(event) => setContactLine(event.target.value)}
        />
        <TextField
          label="社群帳號"
          name="contactSocial"
          placeholder="例：Instagram @your_account"
          value={contactSocial}
          onChange={(event) => setContactSocial(event.target.value)}
        />
        {errors.contact && <p className="text-xs text-red-600">{errors.contact}</p>}
      </Section>

      <Section
        title="良民證"
        description="警察刑事紀錄證明，僅用於身分審核，審核完成後 7 日內刪除原檔。"
      >
        <FileField
          label="良民證＊"
          name="criminalRecord"
          kind="document"
          file={criminalRecord}
          onChange={setCriminalRecord}
          existing={existing?.hasCriminalRecord ? { label: "沿用先前上傳的良民證" } : undefined}
          error={errors.criminalRecord}
        />
      </Section>

      <Section
        title="專業證照（選填）"
        description="例如 ACE、NASM 或運動協會證照，可新增多張。任一張審核通過後，個人檔案與課程卡片會顯示「已認證」徽章；沒有上傳不影響開課。"
      >
        {existing && existing.licenses.length > 0 && (
          <ul className="flex flex-col gap-2">
            {existing.licenses.map((license) => {
              const removed = removedLicenseIds.includes(license.id);
              return (
                <li
                  key={license.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3"
                >
                  <span
                    className={`min-w-0 truncate text-sm ${
                      removed ? "text-neutral-400 line-through" : "text-neutral-900"
                    }`}
                  >
                    {license.name || "未命名證照"}
                    <span className="ml-2 text-xs text-neutral-500">
                      {removed ? "送出後移除" : LICENSE_STATUS_LABELS[license.status]}
                    </span>
                  </span>
                  {/* 已通過的證照關係到「已認證」徽章，不能自己移除 */}
                  {license.status !== "approved" && (
                    <button
                      type="button"
                      onClick={() =>
                        setRemovedLicenseIds((ids) =>
                          removed ? ids.filter((id) => id !== license.id) : [...ids, license.id]
                        )
                      }
                      className="shrink-0 text-sm font-semibold text-brand hover:underline"
                    >
                      {removed ? "復原" : "移除"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <LicenseList value={licenses} onChange={setLicenses} errors={errors.licenses} />
      </Section>

      <Section title="個人資料蒐集同意聲明" description={CONSENT_INTRO}>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-neutral-600">
          {CONSENT_ITEMS.map((item) => (
            <li key={item.title}>
              <span className="font-semibold text-neutral-800">{item.title}：</span>
              {item.body}
            </li>
          ))}
        </ol>
        <CheckboxField
          label={CONSENT_CHECKBOX_LABEL}
          name="consent"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        {errors.consent && <p className="text-xs text-red-600">{errors.consent}</p>}
      </Section>

      {attempted && hasErrors(validation) && (
        <FormError message="還有欄位需要修正，請往上查看紅字提示。" />
      )}
      {submitError && <FormError message={submitError} />}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "上傳並送出中…" : existing ? "重新送審" : "送出申請"}
      </Button>
    </form>
  );
}
