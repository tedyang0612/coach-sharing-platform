// 「我的課程」畫面用的文字。資料層（my-registrations.ts，Ted 維護）還用舊的「成團」用語，
// PRD v4.6 已改成「開課」說法，所以畫面在這裡轉換，不改他的檔案。
// 等 Ted 把資料層的用語改掉之後，這個檔案可以刪掉。
import type { MyRegistrationCategory } from "./my-registrations";

export const TAB_LABELS: Record<MyRegistrationCategory, string> = {
  pending: "待確認開課",
  confirmed: "確定開課",
  cancelled: "已取消",
  completed: "已完成",
};

// 頁籤顯示順序依設計稿 S09：待確認開課、確定開課、已完成、已取消
// （Ted 的 MY_REGISTRATION_CATEGORIES 是 pending、confirmed、cancelled、completed，不動他的檔案）
export const TAB_ORDER: MyRegistrationCategory[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

// 設計稿 S09 的固定文案
export const COPY = {
  emptyAll: "你還沒有報名任何課程，去探索適合你的課吧",
  explore: "探索課程",
  confirmedAnnouncement: "行前公告已送達通知中心，內含教練聯絡方式與集合資訊。",
  // 文案依 PRD v4.7（開課前 24 小時內取消的手續費由 30% 改為 50%）；設計師的 Figma 還是 30%，等更新
  contactCoach:
    "開課前 24 小時內，如需取消，請聯絡該堂教練協助處理，將收取 50% 取消手續費，缺席不予退款。",
  reviewPrompt: "上完課了！留下評價，幫助其他學員選課。",
  cancelledNoCharge: "場次未達開課人數或已取消，不會扣款。",
  refundedFull: "已全額退回你的付款方式（畫面模擬）。",
} as const;

// 待成團 → 待確認開課、已成團 → 確定開課、未成團取消 → 未達人數取消
export function toV46Wording(text: string) {
  return text
    .replaceAll("未成團取消", "未達人數取消")
    .replaceAll("待成團", "待確認開課")
    .replaceAll("已成團", "確定開課");
}

// 取消確認視窗要說明結果（Ted 的 cancel.outcome）
export const CANCEL_OUTCOME_TEXT = {
  cancel_unpaid: "取消後報名會直接取消，尚未扣款。",
  refund_full: "取消後會全額退款，名額會釋出給其他學員。",
} as const;

// 日期與時間分開組字串（台灣時區），例如「10/12（日） 14:00–16:00」
export function formatSessionTime(startIso: string, endIso: string) {
  const date = new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(startIso));
  const time = (iso: string) =>
    new Intl.DateTimeFormat("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Taipei",
    }).format(new Date(iso));
  return `${date} ${time(startIso)}–${time(endIso)}`;
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  }).format(new Date(iso));
}

// 預計通知時間，例如「10/16（四）19:00」
export function formatDeadline(iso: string) {
  const date = new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(iso));
  const time = new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  }).format(new Date(iso));
  return `${date}${time}`;
}
