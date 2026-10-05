// PRD 1.0 規格8／AC5：課程封面圖。純函式＋常數，上傳元件、表單驗證、課程卡片都用這支。
// 封面圖不做內容檢查（不 OCR 擋聯絡資訊），由教練自行負責，違規走檢舉流程。

export const COVER_BUCKET = "course-covers";
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_MIME_TYPES = ["image/jpeg", "image/png"] as const;

const EXTENSION_BY_MIME: Record<(typeof COVER_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const COVER_TYPE_ERROR = "封面圖僅支援 JPG／PNG 格式";
export const COVER_SIZE_ERROR = "封面圖檔案需在 5MB 以內";
export const COVER_URL_ERROR = "封面圖來源不正確，請重新上傳或從圖庫選擇";

// 平台圖庫：依運動項目分類，檔案放在 public/course-covers/。
// 目前是佔位圖，AI 生成圖（每項 1–2 張）到了之後換掉檔案、更新這張表即可，DB 不用動。
const GALLERY_DIR = "/course-covers";
export const COVER_GALLERY: Record<string, string[]> = {
  重訓: [`${GALLERY_DIR}/weight-training-1.svg`],
  瑜珈: [`${GALLERY_DIR}/yoga-1.svg`],
  抱石: [`${GALLERY_DIR}/bouldering-1.svg`],
  衝浪: [`${GALLERY_DIR}/surfing-1.svg`],
  跑酷: [`${GALLERY_DIR}/parkour-1.svg`],
  羽球: [`${GALLERY_DIR}/badminton-1.svg`],
  匹克球: [`${GALLERY_DIR}/pickleball-1.svg`],
  排球: [`${GALLERY_DIR}/volleyball-1.svg`],
};
// sport_type 是自由文字；表單只能選 MVP 八種，清單外（舊資料／之後新增的運動）用通用預設圖
export const COVER_FALLBACK = `${GALLERY_DIR}/default.svg`;

export function galleryFor(sportType: string): string[] {
  return COVER_GALLERY[sportType] ?? [];
}

/** 未設定封面時，依運動項目帶入的預設圖 */
export function defaultCoverFor(sportType: string): string {
  return galleryFor(sportType)[0] ?? COVER_FALLBACK;
}

/** 畫面上實際要顯示的封面（課程卡片、詳情頁、管理頁共用） */
export function resolveCoverUrl(course: { cover_image_url: string | null; sport_type: string }): string {
  return course.cover_image_url || defaultCoverFor(course.sport_type);
}

/** 選檔當下就檢查，不合格直接顯示錯誤、不上傳（AC5） */
export function validateCoverFile(file: { type: string; size: number }): string | null {
  if (!(COVER_MIME_TYPES as readonly string[]).includes(file.type)) return COVER_TYPE_ERROR;
  if (file.size > COVER_MAX_BYTES) return COVER_SIZE_ERROR;
  return null;
}

/** 上傳路徑：{userId}/{隨機檔名}.{ext}，對應 storage policy 只能寫自己的資料夾 */
export function coverStoragePath(userId: string, mimeType: string): string {
  const ext = EXTENSION_BY_MIME[mimeType as keyof typeof EXTENSION_BY_MIME] ?? "jpg";
  return `${userId}/${crypto.randomUUID()}.${ext}`;
}

function storagePublicPrefix(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${COVER_BUCKET}/`;
}

/**
 * 封面網址只接受兩種來源：平台圖庫的站內路徑，或 course-covers bucket 的公開網址。
 * 不接受任意外部網址（可能被拿來放導流連結）。有給 userId 時，bucket 網址必須在這位教練自己的資料夾底下
 * （範本／複製只能來自自己的課程，帶入的圖本來就在自己資料夾，不需要例外）。
 */
export function isAllowedCoverUrl(url: string, opts: { supabaseUrl: string; userId?: string }): boolean {
  if (!url) return true;
  if (url === COVER_FALLBACK || Object.values(COVER_GALLERY).some((list) => list.includes(url))) return true;

  const prefix = storagePublicPrefix(opts.supabaseUrl);
  if (!url.startsWith(prefix)) return false;
  const path = url.slice(prefix.length);
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png)$/i.test(path)) return false;
  return opts.userId ? path.startsWith(`${opts.userId}/`) : true;
}
