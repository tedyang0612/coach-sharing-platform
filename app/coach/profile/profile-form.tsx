"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { updateCoachProfile } from "@/app/actions/coach-profile";
import {
  EducationList,
  useEducationAdder,
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
import { SocialAccountField } from "@/components/coach-application/social-account-field";
import { SportPicker } from "@/components/coach-application/sport-picker";
import { TagInput } from "@/components/coach-application/tag-input";
import { TextAreaField } from "@/components/coach-application/text-area-field";
import { Button, buttonClassName } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import {
  COACH_DOCUMENT_BUCKET,
  COACH_PHOTO_BUCKET,
} from "@/lib/coach-application/constants";
import { DEFAULT_EDUCATION_DEGREE, parseEducation } from "@/lib/coach-application/education";
import { parseSocialAccount, serializeSocialAccount } from "@/lib/coach-application/social";
import { uploadCoachFile } from "@/lib/coach-application/upload";
import {
  contactInfoWarning,
  hasErrors,
  resolveCoachDisplayName,
  validateCoachProfileEdit,
  type CoachProfileEditErrors,
  EXPERIENCE_MAX_LENGTH,
  INTRO_MAX_LENGTH,
  NAME_MAX_LENGTH,
} from "@/lib/coach-application/validation";

export type CoachProfileFormValues = {
  realName: string;
  nickname: string;
  photoUrl: string;
  // 生活／運動照片是後來才加的欄位，較早通過審核的教練可能還沒有
  lifestylePhotoUrl: string;
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
  action,
  children,
}: {
  title: string;
  description?: string;
  // 標題列右邊的動作
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border-default bg-brand-white p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-h3 text-text-primary">{title}</h2>
          {action}
        </div>
        {description && <p className="text-body-small text-text-secondary">{description}</p>}
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
  const [nickname, setNickname] = useState(initial.nickname);
  const [photo, setPhoto] = useState<File | null>(null);
  const [lifestylePhoto, setLifestylePhoto] = useState<File | null>(null);
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
  // 社群帳號分成平台＋帳號兩格，儲存與檢查時再組回資料庫用的單一字串
  const [social, setSocial] = useState(() => parseSocialAccount(initial.contactSocial));
  const contactSocial = serializeSocialAccount(social);

  const [newLicenses, setNewLicenses] = useState<LicenseDraft[]>([]);
  const [removedLicenseIds, setRemovedLicenseIds] = useState<string[]>([]);

  const addEducation = useEducationAdder(education, setEducation);
  const [attempted, setAttempted] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  // 儲存成功後顯示的訊息；有新證照送審時會多提醒一句
  const [savedMessage, setSavedMessage] = useState<string>();
  const [isSaving, startSave] = useTransition();

  const validation = validateCoachProfileEdit({
    realName: initial.realName,
    nickname,
    hasPhoto: photo !== null || initial.photoUrl !== "",
    hasLifestylePhoto: lifestylePhoto !== null || initial.lifestylePhotoUrl !== "",
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
  // 字數超過上限不用等到按儲存，邊打字就提示（QA 回饋，和申請表單一致）
  const tooLong = (message?: string) => (message?.includes("最多") ? message : undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // 儲存時有欄位沒過：捲到第一個有錯的地方；是輸入框的話順便把游標放進去
  function scrollToFirstError() {
    requestAnimationFrame(() => {
      const target = formRef.current?.querySelector<HTMLElement>(
        '[aria-invalid="true"], [data-field-error]'
      );
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      const isTextInput =
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && target.type !== "file");
      if (isTextInput) target.focus({ preventScroll: true });
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setSaveError(undefined);
    setSavedMessage(undefined);
    if (hasErrors(validation)) {
      scrollToFirstError();
      return;
    }

    startSave(async () => {
      try {
        // 有換照片、有新證照才上傳；照片路徑留空代表沿用目前的照片
        const photoPath = photo
          ? await uploadCoachFile(COACH_PHOTO_BUCKET, userId, "photo", photo)
          : "";
        const lifestylePhotoPath = lifestylePhoto
          ? await uploadCoachFile(COACH_PHOTO_BUCKET, userId, "lifestyle", lifestylePhoto)
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
          nickname,
          photoPath,
          lifestylePhotoPath,
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
            ? "已儲存。新增的證照已送審，審核結果會以通知告知。"
            : "已儲存，公開頁已更新。"
        );
        // 新增與移除的證照已經寫入，清掉暫存；最新的證照清單由頁面重新查詢後帶入
        setNewLicenses([]);
        setRemovedLicenseIds([]);
        setPhoto(null);
        setLifestylePhoto(null);
        setAttempted(false);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "儲存失敗，請稍後再試。");
      }
    });
  }

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-4"
      noValidate
      onSubmit={handleSubmit}
      // 儲存成功後只要再動到任何欄位，就把「已儲存」的提示收起來
      onChange={() => setSavedMessage(undefined)}
    >
      <Section title="身分與暱稱">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="真實姓名"
            name="realName"
            value={initial.realName || "（未填寫）"}
            disabled
            readOnly
            hint="用於核對良民證，通過審核後無法自行修改；如需更正請聯繫平台。"
          />
          <TextField
            label="暱稱"
            name="nickname"
            placeholder="請輸入暱稱"
            hint={`公開顯示的名稱，最多 ${NAME_MAX_LENGTH} 個字；未填沿用真實姓名。學員會看到：${resolveCoachDisplayName(initial.realName, nickname)}`}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            error={contactInfoWarning(nickname) ?? errors.nickname ?? tooLong(validation.nickname)}
          />
        </div>
      </Section>

      <Section title="個人照片與運動項目">
        <FileField
          label="大頭貼"
          required
          name="photo"
          kind="photo"
          hint="教練檔案與評價頁使用。JPG／PNG，5MB 以內"
          previewShape="circle"
          file={photo}
          onChange={setPhoto}
          existing={
            initial.photoUrl ? { label: "目前的大頭貼", imageUrl: initial.photoUrl } : undefined
          }
          error={errors.photo}
        />
        <FileField
          label="生活／運動照片"
          required
          name="lifestylePhoto"
          kind="photo"
          hint="首頁推薦教練卡片與教練檔案使用。JPG／PNG，5MB 以內"
          previewShape="portrait"
          file={lifestylePhoto}
          onChange={setLifestylePhoto}
          existing={
            initial.lifestylePhotoUrl
              ? { label: "目前的照片", imageUrl: initial.lifestylePhotoUrl }
              : undefined
          }
          error={errors.lifestylePhoto}
        />
        <SportPicker
          value={sportCategories}
          onChange={setSportCategories}
          error={errors.sportCategories}
        />
      </Section>

      <Section title="特色 Tag" description="最多 5 個、每個 10 字以內；不可填寫聯絡資訊。">
        <TagInput value={tags} onChange={setTags} />
      </Section>

      <Section title="個人學歷（必填，可多筆）">
        <EducationList
          value={education}
          onChange={setEducation}
          error={errors.education}
          itemErrors={errors.educationItems}
        />
        <Button type="button" variant="ghost" onClick={addEducation} className="self-start">
          ＋ 新增學歷
        </Button>
      </Section>

      <Section title="經歷與簡介">
        <TextAreaField
          label="工作／教學經歷"
          hint={`最多 ${EXPERIENCE_MAX_LENGTH} 個字`}
          name="workExperience"
          placeholder="例：知名健身房 5 年教練經驗"
          value={workExperience}
          onChange={(event) => setWorkExperience(event.target.value)}
          error={contactInfoWarning(workExperience) ?? tooLong(validation.workExperience)}
        />
        <TextAreaField
          label="比賽經歷"
          hint={`最多 ${EXPERIENCE_MAX_LENGTH} 個字`}
          name="bioCompetition"
          placeholder="例：全國社會組羽球賽 男雙第 4 名"
          value={bioCompetition}
          onChange={(event) => setBioCompetition(event.target.value)}
          error={contactInfoWarning(bioCompetition) ?? tooLong(validation.bioCompetition)}
        />
        <TextAreaField
          label="簡述"
          required
          hint={`最多 ${INTRO_MAX_LENGTH} 個字`}
          name="bioIntro"
          placeholder="請簡述你的教學風格"
          value={bioIntro}
          onChange={(event) => setBioIntro(event.target.value)}
          error={contactInfoWarning(bioIntro) ?? errors.bioIntro ?? tooLong(validation.bioIntro)}
        />
      </Section>

      <Section
        title="專業證照"
        description="選填，可多張；每張需填名稱並上傳檔案，管理員逐張審核。新追加的證照會顯示「審核中」。"
      >
        <ExistingLicenseList
          licenses={licenses}
          removedIds={removedLicenseIds}
          onRemovedIdsChange={setRemovedLicenseIds}
        />
        <LicenseList value={newLicenses} onChange={setNewLicenses} errors={errors.licenses} />
      </Section>

      <Section
        title="聯絡方式（不公開）"
        description="僅供平台聯繫，以及確定開課後透過行前公告提供給確定開課的學員；至少填一項。"
      >
        <div className="grid gap-3 sm:grid-cols-2">
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
            label="LINE"
            name="contactLine"
            placeholder="請輸入 LINE ID"
            value={contactLine}
            onChange={(event) => setContactLine(event.target.value)}
          />
        </div>
        <SocialAccountField value={social} onChange={setSocial} />
        {errors.contact && (
          <p data-field-error className="text-caption text-state-error-text">
            {errors.contact}
          </p>
        )}
      </Section>

      <p className="text-body-small rounded-md border border-brand-blue bg-tint-blue-100 px-4 py-2.5 text-text-primary">
        公開欄位（簡述、經歷、特色 Tag、證照名稱）禁填電話、Email、LINE ID 或網址。良民證無法在這裡修改，如需更新請聯繫平台。
      </p>

      {attempted && hasErrors(validation) && (
        <FormError message="還有欄位需要修正，已帶你到第一個需要修正的地方。" />
      )}
      {saveError && <FormError message={saveError} />}
      {savedMessage && (
        <p
          role="status"
          className="text-body-small rounded-md border border-brand-blue bg-tint-blue-100 px-4 py-2.5 text-text-primary"
        >
          {savedMessage}{" "}
          <Link href={`/coaches/${userId}`} className="text-brand-deep underline underline-offset-4">
            查看公開頁
          </Link>
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Link href={`/coaches/${userId}`} className={buttonClassName("secondary")}>
          取消
        </Link>
        <Button type="submit" loading={isSaving} loadingText="儲存中">
          儲存變更
        </Button>
      </div>
    </form>
  );
}
