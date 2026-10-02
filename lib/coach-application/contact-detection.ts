/**
 * 公開欄位的聯絡資訊偵測（PRD 第六章 7「聯絡資訊過濾」）。
 * 簡述、學經歷、比賽經驗、特色 Tag、證照名稱偵測到電話、Email、LINE ID 或網址時不能送出。
 *
 * 這是防呆不是防駭：目標是擋下一般人會寫的格式，同時不要誤擋「2015-2019 任職」
 * 「教學 10 年」這類正常內容。表單（即時警示）與 Server Action（第二道防線）共用這支。
 */

export type ContactInfoType = "phone" | "email" | "line" | "url";

export const CONTACT_INFO_LABELS: Record<ContactInfoType, string> = {
  phone: "電話",
  email: "Email",
  line: "LINE ID／社群帳號",
  url: "網址",
};

const CHINESE_DIGITS: Record<string, string> = {
  零: "0",
  〇: "0",
  一: "1",
  二: "2",
  三: "3",
  四: "4",
  五: "5",
  六: "6",
  七: "7",
  八: "8",
  九: "9",
};

// 號碼中間常見的分隔符號：空白、連字號、點、括號
const SEP = "[\\s\\-.()]*";

// 手機：09 開頭共 10 碼，或 +886 9 開頭；前後不能再接數字，避免誤判一長串編號
const MOBILE_RE = new RegExp(
  `(?:^|[^\\d])(?:\\+?886${SEP}9|09)(?:${SEP}\\d){8}(?!\\d)`
);

// 市話：區碼 02–08 加 7–8 碼，中間要有分隔或括號寫法也算
const LANDLINE_RE = new RegExp(
  `(?:^|[^\\d])\\(?0[2-8]\\)?${SEP}\\d{3,4}${SEP}\\d{4}(?!\\d)`
);

const EMAIL_RE = /[a-z0-9._%+-]+\s*@\s*[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/i;

// 網址：有 http(s):// 或 www. 開頭，或是「xxx.com」這種常見網域結尾（含 lin.ee、bit.ly 等短網址）
const URL_RE =
  /(?:https?:\/\/|www\.)\S+|(?:^|[^a-z0-9@.])[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|tw|io|me|cc|co|ly|ee|gl|app|page|link|site|shop|xyz|info|biz)(?![a-z0-9])/i;

// LINE：「LINE ID: xxx」「line:xxx」「加賴」「賴：xxx」；單獨的 @帳號（LINE 官方帳號、IG 帳號）也算
const LINE_RES = [
  /(?:^|[^a-z])line\s*(?:id\s*[:：]?|[:：]|@)\s*[a-z0-9._-]{3,}/i,
  /[加私]\s*(?:賴|line)/i,
  /賴\s*[:：]?\s*@?[a-z0-9._-]{4,}/i,
  /(?:^|[^a-z0-9._%+-])@[a-z0-9._-]{3,}/i,
];

function normalize(text: string): string {
  // NFKC 會把全形英數與符號（０９１２、＠、．）轉成半形
  return text.normalize("NFKC");
}

export function detectContactInfo(text: string): ContactInfoType[] {
  const normalized = normalize(text);
  if (!normalized.trim()) return [];

  const found: ContactInfoType[] = [];

  // 另外檢查一次把國字數字換成阿拉伯數字的版本，擋「零九一二…」這種寫法
  const withArabicDigits = normalized.replace(
    /[零〇一二三四五六七八九]/g,
    (char) => CHINESE_DIGITS[char]
  );
  if (
    MOBILE_RE.test(normalized) ||
    LANDLINE_RE.test(normalized) ||
    MOBILE_RE.test(withArabicDigits)
  ) {
    found.push("phone");
  }

  const hasEmail = EMAIL_RE.test(normalized);
  if (hasEmail) found.push("email");

  // Email 裡的 @xxx 與網域不重複算成 LINE／網址，警示訊息才不會一次跳三種
  const withoutEmails = normalized.replace(new RegExp(EMAIL_RE.source, "gi"), " ");
  if (LINE_RES.some((re) => re.test(withoutEmails))) found.push("line");
  if (URL_RE.test(withoutEmails)) found.push("url");

  return found;
}

export function hasContactInfo(text: string): boolean {
  return detectContactInfo(text).length > 0;
}
