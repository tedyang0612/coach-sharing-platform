// 課程詳情頁「取消與退款規則」的固定文案（設計稿 S05）。
// 手續費比例（30%）要和 Ted 的取消規則（app/registrations、資料庫 coach_assist_refund）一致；
// 新的 50% 文案確定後，設計師與 Ted 會一起改，到時只要改這一個地方。
export const REFUND_RULE_TITLE = "取消與退款規則";

export const REFUND_RULE_LINES = [
  "報名時不扣款，報名截止時開課才扣款；未達人數不扣款。",
  "開課前 24 小時以上可線上取消。",
  "開課前 24 小時內如需取消，請聯絡教練協助處理，並扣除 30% 平台手續費；缺席不予退款。",
] as const;
