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
} from "./constants";
import { CONTACT_INFO_LABELS, detectContactInfo } from "./contact-detection";
import { EDUCATION_DEGREES, type EducationEntry } from "./education";

export type CoachApplicationInput = {
  // 真實姓名必填、不公開（管理員核對良民證用）；暱稱選填，是公開顯示的教練名稱
  realName: string;
  nickname: string;

  // 檔案本身另外用 validateUploadFile() 檢查，這裡只看「有沒有」
  hasPhoto: boolean;
  hasLifestylePhoto: boolean;
  hasCriminalRecord: boolean;

  sportCategories: string[];
  tags: string[];
  education: EducationEntry[];
  workExperience: string;
  bioCompetition: string;
  bioIntro: string;

  // 聯絡方式三項至少填一項；Email 通知寄到註冊帳號的信箱，這裡不另外填
  contactPhone: string;
  contactLine: string;
  contactSocial: string;

  licenses: { name: string; hasFile: boolean }[];
  consent: boolean;
  // 教練合作條款（/coach-terms），PRD v4.8
  termsConsent: boolean;
};

export type CoachApplicationErrors = {
  realName?: string;
  nickname?: string;
  photo?: string;
  lifestylePhoto?: string;
  sportCategories?: string;
  tags?: string;
  // education 是整體錯誤（例如一筆都沒填）；educationItems 的 key 是學歷在清單裡的位置
  education?: string;
  educationItems?: Record<number, string>;
  workExperience?: string;
  bioCompetition?: string;
  bioIntro?: string;
  contact?: string;
  criminalRecord?: string;
  // key 是證照在清單裡的位置（從 0 開始）
  licenses?: Record<number, string>;
  consent?: string;
  termsConsent?: string;
};

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

export const NAME_MAX_LENGTH = 20;

/** 真實姓名必填；暱稱選填，但會公開顯示，所以和其他公開欄位一樣不能含聯絡資訊。 */
export function validateCoachNames(input: {
  realName: string;
  nickname: string;
}): { realName?: string; nickname?: string } {
  const errors: { realName?: string; nickname?: string } = {};
  const realName = input.realName.trim();
  if (!realName) errors.realName = "請填寫真實姓名";
  else if (Array.from(realName).length > NAME_MAX_LENGTH) {
    errors.realName = `真實姓名最多 ${NAME_MAX_LENGTH} 個字`;
  }

  const nickname = input.nickname.trim();
  if (Array.from(nickname).length > NAME_MAX_LENGTH) {
    errors.nickname = `暱稱最多 ${NAME_MAX_LENGTH} 個字`;
  } else {
    const warning = contactInfoWarning(nickname);
    if (warning) errors.nickname = warning;
  }
  return errors;
}

/** 公開顯示的教練名稱：有填暱稱用暱稱，沒填就沿用真實姓名（PM 決定）。 */
export function resolveCoachDisplayName(realName: string, nickname: string): string {
  return nickname.trim() || realName.trim();
}

export function validateCoachApplication(
  input: CoachApplicationInput
): CoachApplicationErrors {
  const errors: CoachApplicationErrors = {};

  const nameErrors = validateCoachNames(input);
  if (nameErrors.realName) errors.realName = nameErrors.realName;
  if (nameErrors.nickname) errors.nickname = nameErrors.nickname;

  if (!input.hasPhoto) errors.photo = "請上傳大頭貼";
  if (!input.hasLifestylePhoto) errors.lifestylePhoto = "請上傳生活／運動照片";

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

  if (input.education.length === 0) {
    errors.education = "請至少填寫一筆學歷";
  } else {
    const educationItemErrors: Record<number, string> = {};
    input.education.forEach((entry, index) => {
      if (!(EDUCATION_DEGREES as readonly string[]).includes(entry.degree)) {
        educationItemErrors[index] = "請選擇學位";
      } else if (!entry.school.trim()) {
        educationItemErrors[index] = "請填寫學校科系";
      } else {
        const warning = contactInfoWarning(entry.school);
        if (warning) educationItemErrors[index] = warning;
      }
    });
    if (Object.keys(educationItemErrors).length > 0) {
      errors.educationItems = educationItemErrors;
    }
  }

  const introError = requiredPublicText(input.bioIntro, "請填寫簡述");
  if (introError) errors.bioIntro = introError;

  // 工作／教學經歷、比賽經歷都是選填，但有填就一樣是公開欄位
  const workExperienceError = contactInfoWarning(input.workExperience);
  if (workExperienceError) errors.workExperience = workExperienceError;

  const competitionError = contactInfoWarning(input.bioCompetition);
  if (competitionError) errors.bioCompetition = competitionError;

  const contacts = [input.contactPhone, input.contactLine, input.contactSocial];
  if (contacts.every((value) => !value.trim())) {
    errors.contact = "聯絡方式請至少填寫一項";
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
  if (!input.termsConsent) errors.termsConsent = "請勾選同意教練合作條款後再送出";

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
      ? "照片只接受 JPG 或 PNG 檔"
      : "只接受 JPG、PNG 或 PDF 檔";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) return "檔案大小不能超過 5MB";
  return undefined;
}
