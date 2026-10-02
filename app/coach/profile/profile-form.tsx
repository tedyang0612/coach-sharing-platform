"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { updateCoachProfile } from "@/app/actions/coach-profile";
import {
  EducationList,
  type EducationDraft,
} from "@/components/coach-application/education-list";
import {
  ExistingLicenseList,
  type ExistingLicense,
} from "@/components/coach-application/existing-license-list";
import { FileField } from "@/components/coach-application/file-field";
import {
  LicenseList,
  type LicenseDraft,
} from "@/components/coach-application/license-list";
import { SportPicker } from "@/components/coach-application/sport-picker";
import { TagInput } from "@/components/coach-application/tag-input";
import { TextAreaField } from "@/components/coach-application/text-area-field";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import {
  COACH_DOCUMENT_BUCKET,
  COACH_PHOTO_BUCKET,
  LICENSE_REVIEW_ESTIMATE,
} from "@/lib/coach-application/constants";
import { DEFAULT_EDUCATION_DEGREE, parseEducation } from "@/lib/coach-application/education";
import { uploadCoachFile } from "@/lib/coach-application/upload";
import {
  contactInfoWarning,
  hasErrors,
  validateCoachProfileEdit,
  type CoachProfileEditErrors,
} from "@/lib/coach-application/validation";

export type CoachProfileFormValues = {
  photoUrl: string;
  sportCategories: string[];
  tags: string[];
  // 資料庫裡的學經歷原文，包含學歷與工作／教學經歷
  bioEducation: string;
  bioCompetition: string;
  bioIntro: string;
  contactPhone: string;
  contactLine: string;
  contactSocial: string;
};

type ProfileFormProps = {
  userId: string;
  initial: CoachProfileFormValues;
  // 已經上傳過的證照；儲存後頁面會重新查詢，所以直接用 props 顯示最新狀態
  licenses: ExistingLicense[];
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

/**
 * 教練編輯個人檔案（PRD 9.0 規格 4）：公開資料、聯絡方式、專業證照都可以改，
 * 只有良民證不能在這裡動。欄位與檢查規則和申請表單共用。
 */
export function ProfileForm({ userId, initial, licenses }: ProfileFormProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [sportCategories, setSportCategories] = useState(initial.sportCategories);
  const [tags, setTags] = useState(initial.tags);
  const [previous] = useState(() => parseEducation(initial.bioEducation));
  const [education, setEducation] = useState<EducationDraft[]>(() => {
    if (previous.entries.length === 0) {
      return [{ key: 1, degree: DEFAULT_EDUCATION_DEGREE, school: "" }];
    }
    return previous.entries.map((entry, index) => ({ key: index + 1, ...entry }));
  });
  const [workExperience, setWorkExperience] = useState(previous.workExperience);
  const [bioCompetition, setBioCompetition] = useState(initial.bioCompetition);
  const [bioIntro, setBioIntro] = useState(initial.bioIntro);

  const [contactPhone, setContactPhone] = useState(initial.contactPhone);
  const [contactLine, setContactLine] = useState(initial.contactLine);
  const [contactSocial, setContactSocial] = useState(initial.contactSocial);

  const [newLicenses, setNewLicenses] = useState<LicenseDraft[]>([]);
  const [removedLicenseIds, setRemovedLicenseIds] = useState<string[]>([]);

  const [attempted, setAttempted] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  // 儲存成功後顯示的訊息；有新證照送審時會多一句預估審核時間
  const [savedMessage, setSavedMessage] = useState<string>();
  const [isSaving, startSave] = useTransition();

  const validation = validateCoachProfileEdit({
    hasPhoto: photo !== null || initial.photoUrl !== "",
    sportCategories,
    tags,
    education,
    workExperience,
    bioCompetition,
    bioIntro,
    contactPhone,
    contactLine,
    contactSocial,
    licenses: newLicenses.map((license) => ({
      name: license.name,
      hasFile: license.file !== null,
    })),
  });
  const errors: CoachProfileEditErrors = attempted ? validation : {};

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setSaveError(undefined);
    setSavedMessage(undefined);
    if (hasErrors(validation)) return;

    startSave(async () => {
      try {
        // 有換照片、有新證照才上傳；照片路徑留空代表沿用目前的照片
        const photoPath = photo
          ? await uploadCoachFile(COACH_PHOTO_BUCKET, userId, "photo", photo)
          : "";
        const uploadedLicenses = [];
        for (const license of newLicenses) {
          // 檢查規則已確保每張證照都有檔案
          if (!license.file) continue;
          uploadedLicenses.push({
            name: license.name,
            filePath: await uploadCoachFile(COACH_DOCUMENT_BUCKET, userId, "license", license.file),
          });
        }

        const result = await updateCoachProfile({
          photoPath,
          sportCategories,
          tags,
          education: education.map(({ degree, school }) => ({ degree, school })),
          workExperience,
          bioCompetition,
          bioIntro,
          contactPhone,
          contactLine,
          contactSocial,
          newLicenses: uploadedLicenses,
          removedLicenseIds,
        });
        if (!result.ok) {
          setSaveError(result.error);
          return;
        }

        setSavedMessage(
          uploadedLicenses.length > 0
            ? `已儲存。新增的證照已送審，${LICENSE_REVIEW_ESTIMATE}完成審核。`
            : "已儲存，公開頁已更新。"
        );
        // 新增與移除的證照已經寫入，清掉暫存；最新的證照清單由頁面重新查詢後帶入
        setNewLicenses([]);
        setRemovedLicenseIds([]);
        setPhoto(null);
        setAttempted(false);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "儲存失敗，請稍後再試。");
      }
    });
  }

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={handleSubmit}
      // 儲存成功後只要再動到任何欄位，就把「已儲存」的提示收起來
      onChange={() => setSavedMessage(undefined)}
    >
      <Section
        title="公開資料"
        description="會公開顯示在你的教練個人檔案，請勿填寫電話、Email、LINE ID 或網址。"
      >
        <FileField
          label="個人照片＊"
          name="photo"
          kind="photo"
          file={photo}
          onChange={setPhoto}
          existing={
            initial.photoUrl ? { label: "目前的照片", imageUrl: initial.photoUrl } : undefined
          }
          error={errors.photo}
        />

        <SportPicker
          value={sportCategories}
          onChange={setSportCategories}
          error={errors.sportCategories}
        />

        <TagInput value={tags} onChange={setTags} />

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
        description="電話、LINE、社群帳號至少填寫一項。不會公開，僅供平台聯繫，以及場次成團後透過行前公告提供給該場次學員。"
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
        title="專業證照"
        description={`可以隨時追加證照送審（${LICENSE_REVIEW_ESTIMATE}）。任一張審核通過後，個人檔案與課程卡片會顯示「已認證」徽章。`}
      >
        <ExistingLicenseList
          licenses={licenses}
          removedIds={removedLicenseIds}
          onRemovedIdsChange={setRemovedLicenseIds}
        />
        <LicenseList value={newLicenses} onChange={setNewLicenses} errors={errors.licenses} />
      </Section>

      <p className="text-xs text-neutral-500">
        良民證無法在這裡修改。如需更新，請聯繫平台。
      </p>

      {attempted && hasErrors(validation) && (
        <FormError message="還有欄位需要修正，請往上查看紅字提示。" />
      )}
      {saveError && <FormError message={saveError} />}
      {savedMessage && (
        <p
          role="status"
          className="rounded-xl border border-brand bg-brand-ink px-4 py-3.5 text-sm font-bold text-brand"
        >
          {savedMessage}{" "}
          <Link href={`/coaches/${userId}`} className="underline">
            查看公開頁
          </Link>
        </p>
      )}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? "儲存中…" : "儲存"}
      </Button>
    </form>
  );
}
