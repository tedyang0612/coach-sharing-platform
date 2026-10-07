"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { submitCoachApplication } from "@/app/actions/coach-application";
import Link from "next/link";
import {
  EducationList,
  useEducationAdder,
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
import { Button, buttonClassName } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import type { LicenseStatus } from "@/types/database";
import { CONSENT_SUMMARY } from "@/lib/coach-application/consent";
import {
  COACH_DOCUMENT_BUCKET,
  COACH_PHOTO_BUCKET,
} from "@/lib/coach-application/constants";
import { DEFAULT_EDUCATION_DEGREE, parseEducation } from "@/lib/coach-application/education";
import { uploadCoachFile } from "@/lib/coach-application/upload";
import {
  contactInfoWarning,
  EXPERIENCE_MAX_LENGTH,
  hasErrors,
  INTRO_MAX_LENGTH,
  NAME_MAX_LENGTH,
  resolveCoachDisplayName,
  validateCoachApplication,
  type CoachApplicationErrors,
} from "@/lib/coach-application/validation";

// 補件／未通過後重新送審時，帶入先前填寫的內容（由 page.tsx 從資料庫讀出）
export type ExistingApplication = {
  status: "needs_more_info" | "rejected";
  realName: string;
  nickname: string;
  rejectionReason: string | null;
  photoUrl: string;
  // 生活／運動照片是後來才加的欄位，較早送出的申請可能沒有
  lifestylePhotoUrl: string | null;
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

// 設計稿 C01：每一段是一張白底卡片，標題前面有編號（1　基本資料）
function Section({
  number,
  title,
  description,
  action,
  children,
}: {
  number: number;
  title: string;
  description?: React.ReactNode;
  // 標題列右邊的動作（例如「＋ 新增學歷」）
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border-default bg-brand-white p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-h3 text-text-primary">
            <span className="mr-3 font-[family-name:var(--font-latin)] font-medium">{number}</span>
            {title}
          </h2>
          {action}
        </div>
        {description && (
          <div className="text-body-small flex flex-col gap-1 text-text-secondary">{description}</div>
        )}
      </div>
      {children}
    </section>
  );
}

type ApplicationFormProps = {
  userId: string;
  // 有值代表是補件／未通過後重新送審
  existing?: ExistingApplication;
  // 第一次申請時帶入註冊帳號的暱稱，教練可以再修改
  defaultNickname?: string;
};

export function ApplicationForm({ userId, existing, defaultNickname }: ApplicationFormProps) {
  const [realName, setRealName] = useState(existing?.realName ?? "");
  const [nickname, setNickname] = useState(existing?.nickname ?? defaultNickname ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [lifestylePhoto, setLifestylePhoto] = useState<File | null>(null);
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
  const [termsConsent, setTermsConsent] = useState(false);

  // 按過一次送出之後才顯示必填錯誤，之後每次修改都即時重新檢查
  const addEducation = useEducationAdder(education, setEducation);
  const [attempted, setAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [isSubmitting, startSubmit] = useTransition();

  const validation = validateCoachApplication({
    realName,
    nickname,
    hasPhoto: photo !== null || Boolean(existing?.photoUrl),
    hasLifestylePhoto: lifestylePhoto !== null || Boolean(existing?.lifestylePhotoUrl),
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
    termsConsent,
  });
  const errors: CoachApplicationErrors = attempted ? validation : {};
  // 字數超過上限不用等到按送出，邊打字就提示（QA 回饋）
  const tooLong = (message?: string) => (message?.includes("最多") ? message : undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // 送出時有欄位沒過：捲到第一個有錯的地方；是輸入框的話順便把游標放進去
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
    setSubmitError(undefined);
    if (hasErrors(validation)) {
      scrollToFirstError();
      return;
    }

    startSubmit(async () => {
      try {
        // 先把檔案傳到 Storage，再把路徑連同其他欄位交給 Server Action 寫入資料庫。
        // 重新送審時沒有重選的檔案不用再傳，路徑留空代表沿用先前的檔案
        const photoPath = photo
          ? await uploadCoachFile(COACH_PHOTO_BUCKET, userId, "photo", photo)
          : "";
        const lifestylePhotoPath = lifestylePhoto
          ? await uploadCoachFile(COACH_PHOTO_BUCKET, userId, "lifestyle", lifestylePhoto)
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
          realName,
          nickname,
          photoPath,
          lifestylePhotoPath,
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
          termsConsent,
        });
        if (result?.error) setSubmitError(result.error);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "送出失敗，請稍後再試。");
      }
    });
  }

  return (
    <form ref={formRef} className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
      {existing && (
        <div className="flex flex-col gap-1.5 rounded-md border border-state-error bg-state-error-bg px-4 py-3.5">
          <p className="text-label text-state-error-text">
            {existing.status === "needs_more_info" ? "補件原因" : "未通過原因"}
          </p>
          <p className="text-body whitespace-pre-line text-state-error-text">
            {existing.rejectionReason ?? "管理員未填寫說明，請聯繫平台。"}
          </p>
          <p className="text-caption text-text-secondary">
            已帶入你先前填寫的內容，修改後送出就會重新進入審核。
          </p>
        </div>
      )}

      <Section number={1} title="基本資料">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="真實姓名"
            required
            name="realName"
            autoComplete="name"
            placeholder="請輸入真實姓名"
            hint={`不公開，僅供管理員核對良民證。最多 ${NAME_MAX_LENGTH} 個字`}
            value={realName}
            onChange={(event) => setRealName(event.target.value)}
            error={errors.realName ?? tooLong(validation.realName)}
          />
          <TextField
            label="暱稱"
            name="nickname"
            placeholder="請輸入暱稱"
            hint={`公開顯示的名稱，最多 ${NAME_MAX_LENGTH} 個字；未填沿用真實姓名。學員會看到：${
              resolveCoachDisplayName(realName, nickname) || "（請先填寫真實姓名）"
            }`}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            error={contactInfoWarning(nickname) ?? errors.nickname ?? tooLong(validation.nickname)}
          />
        </div>

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
            existing?.photoUrl
              ? { label: "沿用先前上傳的大頭貼", imageUrl: existing.photoUrl }
              : undefined
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
            existing?.lifestylePhotoUrl
              ? { label: "沿用先前上傳的照片", imageUrl: existing.lifestylePhotoUrl }
              : undefined
          }
          error={errors.lifestylePhoto}
        />

        <SportPicker
          value={sportCategories}
          onChange={setSportCategories}
          error={errors.sportCategories}
        />

        <TagInput value={tags} onChange={setTags} />

        {/* 公開欄位邊打字邊檢查聯絡資訊，偵測到就即時警示（PRD 第六章 7） */}
        <TextAreaField
          label="簡述"
          required
          name="bioIntro"
          placeholder="請簡述你的教學風格"
          hint={`最多 ${INTRO_MAX_LENGTH} 個字`}
          value={bioIntro}
          onChange={(event) => setBioIntro(event.target.value)}
          error={contactInfoWarning(bioIntro) ?? errors.bioIntro ?? tooLong(validation.bioIntro)}
        />
      </Section>

      <Section
        number={2}
        title="學歷與經歷"
        action={
          <Button type="button" variant="ghost" onClick={addEducation}>
            ＋ 新增學歷
          </Button>
        }
      >
        <EducationList
          value={education}
          onChange={setEducation}
          error={errors.education}
          itemErrors={errors.educationItems}
        />

        <TextAreaField
          label="工作／教學經歷"
          name="workExperience"
          placeholder="例：知名健身房 5 年教練經驗"
          hint={`最多 ${EXPERIENCE_MAX_LENGTH} 個字`}
          value={workExperience}
          onChange={(event) => setWorkExperience(event.target.value)}
          error={contactInfoWarning(workExperience) ?? tooLong(validation.workExperience)}
        />

        <TextAreaField
          label="比賽經歷"
          name="bioCompetition"
          placeholder="例：全國社會組羽球賽 男雙第 4 名"
          hint={`最多 ${EXPERIENCE_MAX_LENGTH} 個字`}
          value={bioCompetition}
          onChange={(event) => setBioCompetition(event.target.value)}
          error={contactInfoWarning(bioCompetition) ?? tooLong(validation.bioCompetition)}
        />
      </Section>

      <Section
        number={3}
        title="聯絡方式（不公開）"
        description={
          <p>
            電話、LINE、社群帳號至少填一項；Email
            使用註冊帳號信箱。僅供平台聯繫，以及確定開課後透過行前公告提供給確定開課的學員。
          </p>
        }
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
        <TextField
          label="社群帳號"
          name="contactSocial"
          placeholder="請輸入社群帳號"
          value={contactSocial}
          onChange={(event) => setContactSocial(event.target.value)}
        />
        {errors.contact && (
          <p data-field-error className="text-caption text-state-error-text">
            {errors.contact}
          </p>
        )}
      </Section>

      <Section
        number={4}
        title="身分文件"
        description={
          // 申請方式與費用依內政部警政署公告（2026/10 查詢），之後若有調整請同步更新
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>用途：學員會與教練實際見面，良民證作為基本把關。</li>
            <li>保管：僅用於審核，審核完成後 7 日內刪除原檔。</li>
            <li>申請：警政署網站線上申請，到警察局領取；每份 100 元，約 1–3 個工作天。</li>
          </ul>
        }
      >
        <FileField
          label="上傳良民證"
          required
          name="criminalRecord"
          kind="document"
          file={criminalRecord}
          onChange={setCriminalRecord}
          existing={existing?.hasCriminalRecord ? { label: "沿用先前上傳的良民證" } : undefined}
          error={errors.criminalRecord}
        />
      </Section>

      <Section
        number={5}
        title="專業證照"
        description={
          <p>
            可上傳多張，逐張審核。任一張通過後，你的公開檔案與課程卡片的教練名稱旁會顯示「已認證」徽章，公開檔案也會列出證照名稱。
          </p>
        }
      >
        {existing && existing.licenses.length > 0 && (
          <ul className="flex flex-col gap-2">
            {existing.licenses.map((license) => {
              const removed = removedLicenseIds.includes(license.id);
              return (
                <li
                  key={license.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-brand-light px-4 py-3"
                >
                  <span
                    className={`text-body min-w-0 truncate ${
                      removed ? "text-state-disabled-text line-through" : "text-text-primary"
                    }`}
                  >
                    {license.name || "未命名證照"}
                    <span className="text-caption ml-2 text-text-secondary">
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
                      className="text-label shrink-0 text-brand-deep underline underline-offset-4"
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

      {/* 細節放在條款頁，表單上只留摘要與勾選（QA 回饋）；連結樣式比照註冊頁，開新分頁免得表單被帶走 */}
      <Section number={6} title="個資蒐集與條款同意" description={<p>{CONSENT_SUMMARY}</p>}>
        <CheckboxField
          label={
            <>
              我已閱讀
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">
                隱私權政策
              </Link>
              ，並同意本平台為審核教練身分，蒐集、處理及利用我提供的個人資料與良民證。
            </>
          }
          name="consent"
          checked={consent}
          invalid={Boolean(errors.consent)}
          onChange={(event) => setConsent(event.target.checked)}
        />
        {errors.consent && (
          <p data-field-error className="text-caption text-state-error-text">
            {errors.consent}
          </p>
        )}

        <CheckboxField
          label={
            <>
              我已閱讀並同意
              <Link
                href="/coach-terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                教練合作條款
              </Link>
            </>
          }
          name="termsConsent"
          checked={termsConsent}
          invalid={Boolean(errors.termsConsent)}
          onChange={(event) => setTermsConsent(event.target.checked)}
        />
        {errors.termsConsent && (
          <p data-field-error className="text-caption text-state-error-text">
            {errors.termsConsent}
          </p>
        )}
      </Section>

      {attempted && hasErrors(validation) && (
        <FormError message="還有欄位需要修正，已帶你到第一個需要修正的地方。" />
      )}
      {submitError && <FormError message={submitError} />}

      <div className="flex justify-end gap-3">
        <Link href={existing ? "/coach/application" : "/become-coach"} className={buttonClassName("secondary")}>
          取消
        </Link>
        <Button type="submit" loading={isSubmitting} loadingText="上傳並送出中">
          {existing ? "重新送審" : "送出申請"}
        </Button>
      </div>
    </form>
  );
}
