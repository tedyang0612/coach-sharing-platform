// 「我的課程」畫面用的文字。資料層（my-registrations.ts，Ted 維護）的用語已改成
// 「待確認開課／確定開課」等（Ted 的 13.0 更新），不用再轉換。取消的場次不再有獨立的
// 「未達人數取消」狀態，StatusLine 顯示「已取消」加原因。
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
  reviewPrompt: "上完課了！留下評價，幫助其他學員選課。",
  cancelledNoCharge: "場次未達開課人數或已取消，不會扣款。",
  refundedFull: "已全額退回你的付款方式（畫面模擬）。",
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
