// PRD 1.0 規格5／跳單防範：公開欄位（課程名稱、課程介紹、課程須知）不能填聯絡方式。
// 前端表單即時提示、server action 送出前都用這支檢查，兩邊規則一致，不能只靠前端擋。

export const CONTACT_INFO_MESSAGE = "為保障雙方交易安全，請勿於公開欄位填寫個人聯絡資訊";

export type ContactInfoKind = "phone" | "line" | "email" | "url";

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

// 數字中間的空白／連字號／點／括號先黏起來再比對，擋「0912-345-678」「0912 345 678」這類寫法；
// 冒號不在裡面，所以「14:00-17:00」不會被黏成一串長數字。
const DIGIT_SEPARATOR_RE = /(\d)[\s\-.()（）]+(?=\d)/g;
const MOBILE_RE = /(?<!\d)(?:\+?886|0)9\d{8}(?!\d)/;
const LANDLINE_RE = /(?<!\d)(?:\+?886|0)[2-8]\d{7,8}(?!\d)/;

// LINE：英文單字 line（\b 讓 online／deadline 不會誤判）、常見中文說法、以及 @ 開頭的官方帳號 ID
const LINE_RE = /\bline\b|加賴|私賴|賴我|@[a-z0-9._-]+/i;

const URL_RE = /https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|tw|cc|ly|me|io|co|gl|ee|to|app|link)\b/i;

/** 回傳偵測到的聯絡方式種類；空陣列＝沒問題 */
export function detectContactInfo(text: string | null | undefined): ContactInfoKind[] {
  if (!text) return [];
  // NFKC 把全形英數（０９１２、ｌｉｎｅ、＠）轉半形，避免用全形字繞過
  const normalized = text.normalize("NFKC");
  const found: ContactInfoKind[] = [];

  const hasEmail = EMAIL_RE.test(normalized);
  if (hasEmail) found.push("email");

  const digits = normalized.replace(DIGIT_SEPARATOR_RE, "$1");
  if (MOBILE_RE.test(digits) || LANDLINE_RE.test(digits)) found.push("phone");

  // Email 本身也含 @，已經判定是 Email 就不重複算成 LINE ID
  const withoutEmail = hasEmail ? normalized.replace(new RegExp(EMAIL_RE, "gi"), " ") : normalized;
  if (LINE_RE.test(withoutEmail)) found.push("line");
  if (URL_RE.test(withoutEmail)) found.push("url");

  return found;
}

export function containsContactInfo(text: string | null | undefined): boolean {
  return detectContactInfo(text).length > 0;
}
