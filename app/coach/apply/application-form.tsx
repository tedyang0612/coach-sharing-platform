"use client";

import { useState } from "react";
import { SportPicker } from "@/components/coach-application/sport-picker";
import { TagInput } from "@/components/coach-application/tag-input";
import { TextAreaField } from "@/components/coach-application/text-area-field";
import { TextField } from "@/components/ui/text-field";
import { YEARS_EXPERIENCE_MAX } from "@/lib/coach-application/constants";
import { contactInfoWarning } from "@/lib/coach-application/validation";

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

  return (
    <form className="flex flex-col gap-6" noValidate>
      <Section
        title="個人檔案"
        description="審核通過後會公開顯示在你的教練個人檔案，請勿填寫電話、Email、LINE ID 或網址。"
      >
        <SportPicker value={sportCategories} onChange={setSportCategories} />

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
        />

        {/* 公開欄位邊打字邊檢查聯絡資訊，偵測到就即時警示（PRD 第六章 7） */}
        <TextAreaField
          label="個人學／經歷＊"
          name="bioEducation"
          placeholder="例：體育大學運動科學系畢業，曾任健身房教練 3 年"
          value={bioEducation}
          onChange={(event) => setBioEducation(event.target.value)}
          error={contactInfoWarning(bioEducation)}
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
          error={contactInfoWarning(bioIntro)}
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
        />
        <TextField
          label="社群帳號"
          name="contactSocial"
          placeholder="例：Instagram @your_account"
          value={contactSocial}
          onChange={(event) => setContactSocial(event.target.value)}
        />
      </Section>
    </form>
  );
}
