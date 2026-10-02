/**
 * PRD 4.0 教練申請／9.0 教練個人檔案共用的設定值。
 * 數值來源：PRD v4.2 第六章「系統設定值」，改 PRD 時記得回來同步。
 */

// MVP 運動種類（PRD v4.1 起限縮為八種）。
// types/database.ts 的 SPORT_TYPES 目前還是舊版五種，等 Ted 更新共用清單後改成從那邊 import。
export const SPORT_CATEGORIES = [
  "重訓",
  "瑜珈",
  "跑酷",
  "攀岩",
  "衝浪",
  "羽球",
  "匹克球",
  "排球",
] as const;

export type SportCategory = (typeof SPORT_CATEGORIES)[number];

// 特色 Tag：教練自由輸入，這份清單只是輸入時的建議選項，依分類顯示。
export const PRESET_TAG_GROUPS = [
  {
    label: "對象",
    tags: ["新手友善", "女性友善", "銀髮族適合", "親子可參加", "上班族", "產後恢復"],
  },
  {
    label: "教學風格",
    tags: ["耐心細心", "嚴格扎實", "氣氛輕鬆", "重視基礎", "動作矯正"],
  },
  {
    label: "目標",
    tags: ["減脂", "增肌", "體態調整", "肌力提升", "舒壓放鬆", "專項訓練", "運動傷害預防"],
  },
  {
    label: "其他",
    tags: ["中英雙語", "提供器材", "台語也會通"],
  },
] as const;

export const PRESET_TAGS: readonly string[] = PRESET_TAG_GROUPS.flatMap(
  (group) => [...group.tags]
);

export const TAG_MAX_COUNT = 5;
export const TAG_MAX_LENGTH = 10;

export const YEARS_EXPERIENCE_MAX = 60;

// 上傳檔案限制：單檔 5MB；個人照片只收圖片，良民證與證照另外可收 PDF。
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png"] as const;
export const DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

// PRD 系統規則總覽「聯絡資訊」的警示文案。
export const CONTACT_INFO_WARNING =
  "為保障雙方交易安全，請勿於公開欄位填寫個人聯絡資訊";
