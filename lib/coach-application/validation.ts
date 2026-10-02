/**
 * 教練申請表單的檢查規則（PRD 4.0 AC 5–7）。
 * 表單（送出前）與 Server Action（第二道防線）共用，兩邊規則才不會對不上。
 */

import {
  CONTACT_INFO_WARNING,
  DOCUMENT_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  PHOTO_MIME_TYPES,
  SPORT_CATEGORIES,
  TAG_MAX_COUNT,
  TAG_MAX_LENGTH,
  YEARS_EXPERIENCE_MAX,
} from "./constants";
import { CONTACT_INFO_LABELS, detectContactInfo } from "./contact-detection";

export type CoachApplicationInput = {
  // 檔案本身另外用 validateUploadFile() 檢查，這裡只看「有沒有」
  hasPhoto: boolean;
  hasCriminalRecord: boolean;

  sportCategories: string[];
  tags: string[];
  yearsExperience: number | null;
  bioEducation: string;
  bioCompetition: string;
  bioIntro: string;

  contactPhone: string;
  contactLine: string;
  contactEmail: string;
  contactSocial: string;

  licenses: { name: string; hasFile: boolean }[];
  consent: boolean;
};

export type CoachApplicationErrors = {
  photo?: string;
  sportCategories?: string;
  tags?: string;
  yearsExperience?: string;
  bioEducation?: string;
  bioCompetition?: string;
  bioIntro?: string;
  contact?: string;
  contactEmail?: string;
  criminalRecord?: string;
  // key 是證照在清單裡的位置（從 0 開始）
  licenses?: Record<number, string>;
  consent?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 公開欄位含聯絡資訊時回傳警示文字，沒有則回傳 undefined。 */
export function contactInfoWarning(text: string): string | undefined {
  const found = detectContactInfo(text);
  if (found.length === 0) return undefined;
  const labels = found.map((type) => CONTACT_INFO_LABELS[type]).join("、");
  return `${CONTACT_INFO_WARNING}（偵測到：${labels}）`;
}

function requiredPublicText(value: string, emptyMessage: string): string | undefined {
  if (!value.trim()) return emptyMessage;
  return contactInfoWarning(value);
}

function validateTags(tags: string[]): string | undefined {
  if (tags.length > TAG_MAX_COUNT) return `特色 Tag 最多 ${TAG_MAX_COUNT} 個`;

  const seen = new Set<string>();
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag) return "特色 Tag 不能是空白";
    // 用 Array.from 算字數，emoji 這類字元才不會被算成兩個字
    if (Array.from(tag).length > TAG_MAX_LENGTH) {
      return `每個特色 Tag 最多 ${TAG_MAX_LENGTH} 個字（「${tag}」太長）`;
    }
    if (seen.has(tag)) return `特色 Tag「${tag}」重複了`;
    seen.add(tag);

    const warning = contactInfoWarning(tag);
    if (warning) return warning;
  }
  return undefined;
}

export function validateCoachApplication(
  input: CoachApplicationInput
): CoachApplicationErrors {
  const errors: CoachApplicationErrors = {};

  if (!input.hasPhoto) errors.photo = "請上傳個人照片";

  if (input.sportCategories.length === 0) {
    errors.sportCategories = "請至少選擇一項運動類別";
  } else if (
    input.sportCategories.some(
      (sport) => !(SPORT_CATEGORIES as readonly string[]).includes(sport)
    )
  ) {
    errors.sportCategories = "運動類別包含不在清單內的項目";
  }

  const tagsError = validateTags(input.tags);
  if (tagsError) errors.tags = tagsError;

  if (input.yearsExperience !== null) {
    const years = input.yearsExperience;
    if (!Number.isInteger(years) || years < 0 || years > YEARS_EXPERIENCE_MAX) {
      errors.yearsExperience = `年資請填 0–${YEARS_EXPERIENCE_MAX} 的整數`;
    }
  }

  const educationError = requiredPublicText(input.bioEducation, "請填寫個人學／經歷");
  if (educationError) errors.bioEducation = educationError;

  const introError = requiredPublicText(input.bioIntro, "請填寫簡述");
  if (introError) errors.bioIntro = introError;

  // 比賽經驗選填，但有填就一樣是公開欄位
  const competitionError = contactInfoWarning(input.bioCompetition);
  if (competitionError) errors.bioCompetition = competitionError;

  const contacts = [
    input.contactPhone,
    input.contactLine,
    input.contactEmail,
    input.contactSocial,
  ];
  if (contacts.every((value) => !value.trim())) {
    errors.contact = "聯絡方式請至少填寫一項";
  }
  const email = input.contactEmail.trim();
  if (email && !EMAIL_RE.test(email)) {
    errors.contactEmail = "請輸入正確格式的 Email";
  }

  if (!input.hasCriminalRecord) errors.criminalRecord = "請上傳良民證";

  const licenseErrors: Record<number, string> = {};
  input.licenses.forEach((license, index) => {
    if (!license.name.trim()) {
      licenseErrors[index] = "請填寫證照名稱";
    } else if (!license.hasFile) {
      licenseErrors[index] = "請上傳證照檔案";
    } else {
      // 證照名稱之後會顯示在教練個人檔案，同樣算公開欄位
      const warning = contactInfoWarning(license.name);
      if (warning) licenseErrors[index] = warning;
    }
  });
  if (Object.keys(licenseErrors).length > 0) errors.licenses = licenseErrors;

  if (!input.consent) errors.consent = "請勾選同意個資蒐集聲明後再送出";

  return errors;
}

export function hasErrors(errors: CoachApplicationErrors): boolean {
  return Object.keys(errors).length > 0;
}

export type UploadKind = "photo" | "document";

/** 檢查上傳檔案的格式與大小；通過回傳 undefined。 */
export function validateUploadFile(
  file: { type: string; size: number },
  kind: UploadKind
): string | undefined {
  const allowed: readonly string[] =
    kind === "photo" ? PHOTO_MIME_TYPES : DOCUMENT_MIME_TYPES;
  if (!allowed.includes(file.type)) {
    return kind === "photo"
      ? "個人照片只接受 JPG 或 PNG 檔"
      : "只接受 JPG、PNG 或 PDF 檔";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) return "檔案大小不能超過 5MB";
  return undefined;
}
