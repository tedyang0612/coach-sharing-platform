/**
 * 教練聯絡方式的「社群帳號」：平台＋帳號。
 * 資料庫只有一個文字欄位 coach_profiles.contact_social，所以存成「平台：帳號」（例：Instagram：duoduo.parkour）。
 * 確定開課的行前通知會直接把這個欄位接在「社群：」後面，學員看得到是哪個平台的帳號。
 */

export const SOCIAL_PLATFORMS = ["Instagram", "Facebook", "LinkedIn", "YouTube"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const DEFAULT_SOCIAL_PLATFORM: SocialPlatform = "Instagram";

const SEPARATOR = "：";

export type SocialAccount = { platform: SocialPlatform; account: string };

/** 把資料庫的字串拆回平台與帳號；沒有平台前綴的舊資料，帳號原樣帶入、平台先用預設值讓教練自己確認。 */
export function parseSocialAccount(stored: string | null | undefined): SocialAccount {
  const value = (stored ?? "").trim();
  const platform = SOCIAL_PLATFORMS.find((item) => value.startsWith(`${item}${SEPARATOR}`));
  if (!platform) return { platform: DEFAULT_SOCIAL_PLATFORM, account: value };
  return { platform, account: value.slice(platform.length + SEPARATOR.length).trim() };
}

/** 組成要存進資料庫的字串；帳號沒填就存空字串（代表沒有提供社群帳號）。 */
export function serializeSocialAccount({ platform, account }: SocialAccount): string {
  const trimmed = account.trim();
  return trimmed ? `${platform}${SEPARATOR}${trimmed}` : "";
}
