/**
 * PRD 4.0 教練申請／9.0 教練個人檔案共用的設定值。
 * 數值來源：PRD v4.2 第六章「系統設定值」，改 PRD 時記得回來同步。
 */

// MVP 運動種類（PRD v4.1 起限縮為八種）。
// 共用清單是 types/database.ts 的 SPORT_TYPES，但八種版本要等 1.0 PR 合併才會在 main 上；
// 合併後這裡改成直接 import SPORT_TYPES，不要留兩份清單。
export const SPORT_CATEGORIES = [
  "重訓",
  "瑜珈",
  "羽球",
  "排球",
  "匹克球",
  "衝浪",
  "抱石",
  "跑酷",
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

// 證照名稱：教練自由輸入，這份清單只是輸入時的建議選項（名稱寫法一致，人工審核比較好核對）。
export const LICENSE_SUGGESTION_GROUPS = [
  {
    label: "健身／重訓",
    names: ["ACE-CPT", "NASM-CPT", "NSCA-CPT", "NSCA-CSCS", "ACSM-CPT", "AFAA"],
  },
  {
    label: "瑜珈",
    names: ["RYT 200", "RYT 500"],
  },
  {
    label: "國內通用",
    names: [
      "體育署國民體適能指導員（初級）",
      "體育署國民體適能指導員（中級）",
      "運動防護員",
      "單項協會 C 級教練證",
      "單項協會 B 級教練證",
      "單項協會 A 級教練證",
    ],
  },
  {
    label: "衝浪",
    names: ["ISA 衝浪教練"],
  },
  {
    label: "匹克球",
    names: ["PPR", "IPTPA"],
  },
  {
    label: "跑酷",
    names: ["ADAPT"],
  },
  {
    label: "急救",
    names: ["CPR＋AED", "EMT-1", "紅十字會急救員"],
  },
] as const;

export const LICENSE_SUGGESTIONS: readonly string[] =
  LICENSE_SUGGESTION_GROUPS.flatMap((group) => [...group.names]);

// 上傳檔案限制：單檔 5MB；大頭貼與生活／運動照片只收圖片，良民證與證照另外可收 PDF。
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png"] as const;
export const DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

// Storage bucket（migration 0020）：照片公開讀取；良民證與證照只有本人與管理員可讀。
// 檔案一律放在「{使用者 id}/」底下，Storage policy 只允許寫自己的資料夾。
export const COACH_PHOTO_BUCKET = "coach-photos";
export const COACH_DOCUMENT_BUCKET = "coach-documents";

// PRD 系統規則總覽「聯絡資訊」的警示文案。
export const CONTACT_INFO_WARNING =
  "為保障雙方交易安全，請勿於公開欄位填寫個人聯絡資訊";
