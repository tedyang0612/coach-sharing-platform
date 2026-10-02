"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { updateCoachProfile } from "@/app/actions/coach-profile";
import {
  EducationList,
  type EducationDraft,
} from "@/components/coach-application/education-list";
import { FileField } from "@/components/coach-application/file-field";
import { SportPicker } from "@/components/coach-application/sport-picker";
import { TagInput } from "@/components/coach-application/tag-input";
import { TextAreaField } from "@/components/coach-application/text-area-field";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { COACH_PHOTO_BUCKET } from "@/lib/coach-application/constants";
import { DEFAULT_EDUCATION_DEGREE, parseEducation } from "@/lib/coach-application/education";
import { uploadCoachFile } from "@/lib/coach-application/upload";
import {
  contactInfoWarning,
  hasErrors,
  validateCoachPublicProfile,
  type CoachPublicProfileErrors,
} from "@/lib/coach-application/validation";

export type CoachProfileFormValues = {
  photoUrl: string;
  sportCategories: string[];
  tags: string[];
  // 資料庫裡的學經歷原文，包含學歷與工作／教學經歷
  bioEducation: string;
  bioCompetition: string;
  bioIntro: string;
};

type ProfileFormProps = {
  userId: string;
  initial: CoachProfileFormValues;
};

/** 教練編輯自己的公開個人檔案（PRD 9.0 規格 4）；欄位與檢查規則和申請表單的「個人檔案」區塊相同。 */
export function ProfileForm({ userId, initial }: ProfileFormProps) {
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

  const [attempted, setAttempted] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [isSaving, startSave] = useTransition();

  const validation = validateCoachPublicProfile({
    hasPhoto: photo !== null || initial.photoUrl !== "",
    sportCategories,
    tags,
    education,
    workExperience,
    bioCompetition,
    bioIntro,
  });
  const errors: CoachPublicProfileErrors = attempted ? validation : {};

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setSaveError(undefined);
    setSaved(false);
    if (hasErrors(validation)) return;

    startSave(async () => {
      try {
        // 有換照片才上傳；路徑留空代表沿用目前的照片
        const photoPath = photo
          ? await uploadCoachFile(COACH_PHOTO_BUCKET, userId, "photo", photo)
          : "";
        const result = await updateCoachProfile({
          photoPath,
          sportCategories,
          tags,
          education: education.map(({ degree, school }) => ({ degree, school })),
          workExperience,
          bioCompetition,
          bioIntro,
        });
        if (result.ok) {
          setSaved(true);
        } else {
          setSaveError(result.error);
        }
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "儲存失敗，請稍後再試。");
      }
    });
  }

  return (
    <form
      className="flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6"
      noValidate
      onSubmit={handleSubmit}
      // 儲存成功後只要再動到任何欄位，就把「已儲存」的提示收起來
      onChange={() => setSaved(false)}
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

      {attempted && hasErrors(validation) && (
        <FormError message="還有欄位需要修正，請往上查看紅字提示。" />
      )}
      {saveError && <FormError message={saveError} />}
      {saved && (
        <p
          role="status"
          className="rounded-xl border border-brand bg-brand-ink px-4 py-3.5 text-sm font-bold text-brand"
        >
          已儲存，公開頁已更新。{" "}
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
