"use client";

import { useState, type FormEvent } from "react";
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
import {
  CONSENT_CHECKBOX_LABEL,
  CONSENT_INTRO,
  CONSENT_ITEMS,
} from "@/lib/coach-application/consent";
import { YEARS_EXPERIENCE_MAX } from "@/lib/coach-application/constants";
import {
  contactInfoWarning,
  hasErrors,
  validateCoachApplication,
  type CoachApplicationErrors,
} from "@/lib/coach-application/validation";

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

export function ApplicationForm() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [sportCategories, setSportCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState("");
  const [bioEducation, setBioEducation] = useState("");
  const [bioCompetition, setBioCompetition] = useState("");
  const [bioIntro, setBioIntro] = useState("");

  const [contactPhone, setContactPhone] = useState("");
  const [contactLine, setContactLine] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSocial, setContactSocial] = useState("");

  const [criminalRecord, setCriminalRecord] = useState<File | null>(null);
  const [licenses, setLicenses] = useState<LicenseDraft[]>([]);
  const [consent, setConsent] = useState(false);

  // 按過一次送出之後才顯示必填錯誤，之後每次修改都即時重新檢查
  const [attempted, setAttempted] = useState(false);

  const validation = validateCoachApplication({
    hasPhoto: photo !== null,
    hasCriminalRecord: criminalRecord !== null,
    sportCategories,
    tags,
    // 空白代表沒填；填了非數字會變成 NaN，交給檢查規則擋下
    yearsExperience: yearsExperience.trim() === "" ? null : Number(yearsExperience),
    bioEducation,
    bioCompetition,
    bioIntro,
    contactPhone,
    contactLine,
    contactEmail,
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
    // 上傳檔案與寫入資料庫在下一個步驟接上（需要 Storage bucket），目前只做到送出前的檢查
    setAttempted(true);
  }

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
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
          error={errors.photo}
        />

        <SportPicker
          value={sportCategories}
          onChange={setSportCategories}
          error={errors.sportCategories}
        />

        <TagInput value={tags} onChange={setTags} />

        <TextField
          label="訓練／教學年資（選填）"
          name="yearsExperience"
          type="number"
          inputMode="numeric"
          min={0}
          max={YEARS_EXPERIENCE_MAX}
          placeholder="例：5"
          value={yearsExperience}
          onChange={(event) => setYearsExperience(event.target.value)}
          error={errors.yearsExperience}
        />

        {/* 公開欄位邊打字邊檢查聯絡資訊，偵測到就即時警示（PRD 第六章 7） */}
        <TextAreaField
          label="個人學／經歷＊"
          name="bioEducation"
          placeholder="例：體育大學運動科學系畢業，曾任健身房教練 3 年"
          value={bioEducation}
          onChange={(event) => setBioEducation(event.target.value)}
          error={contactInfoWarning(bioEducation) ?? errors.bioEducation}
        />

        <TextAreaField
          label="比賽經驗（選填）"
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
        description="至少填寫一項。不會公開，僅供平台聯繫，以及場次成團後透過行前公告提供給該場次學員。"
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
          label="Email"
          name="contactEmail"
          type="email"
          autoComplete="email"
          placeholder="coach@example.com"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          error={errors.contactEmail}
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
          error={errors.criminalRecord}
        />
      </Section>

      <Section
        title="專業證照（選填）"
        description="例如 ACE、NASM 或運動協會證照，可新增多張。任一張審核通過後，個人檔案與課程卡片會顯示「已認證」徽章；沒有上傳不影響開課。"
      >
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
      {attempted && !hasErrors(validation) && (
        <p
          role="status"
          className="rounded-xl border border-brand bg-brand-ink px-4 py-3.5 text-sm font-bold text-brand"
        >
          填寫內容檢查通過。上傳與送出功能尚未開通，資料目前不會被儲存。
        </p>
      )}

      <Button type="submit">送出申請</Button>
    </form>
  );
}
