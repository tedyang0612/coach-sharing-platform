// 場次狀態顯示、教練取消場次、編輯鎖定的規則。純函式，頁面（顯示按鈕與否）和 server action（實際把關）共用。

import type { RegistrationStatus, SessionStatus } from "@/types/database";

// 「有效報名」＝還佔著名額的報名。cancelled／refunded／partial_refunded 都是已經退出的學員。
export const ACTIVE_REGISTRATION_STATUSES: RegistrationStatus[] = ["pending_match", "confirmed", "completed"];

export function isActiveRegistration(status: RegistrationStatus): boolean {
  return ACTIVE_REGISTRATION_STATUSES.includes(status);
}

// PRD 1.0 規格4：教練工作台「我的課程」依狀態分組
export type SessionDisplayStatus = "recruiting" | "matched" | "ended" | "cancelled";

export const SESSION_DISPLAY_LABELS: Record<SessionDisplayStatus, string> = {
  recruiting: "招生中",
  matched: "確定開課",
  ended: "已結束",
  cancelled: "已取消",
};

/**
 * DB 狀態 → 畫面上的四種分組。
 * 排程（complete_finished_sessions）每小時才跑一次，所以時間已經過了但狀態還沒被更新的場次，
 * 這裡也直接當「已結束」，避免畫面上出現「招生中」但課早就上完的情況。
 */
export function sessionDisplayStatus(
  session: { status: SessionStatus; end_at: string },
  now: Date = new Date()
): SessionDisplayStatus {
  switch (session.status) {
    case "cancelled":
    case "cancelled_by_coach":
    case "cancelled_unmatched":
      return "cancelled";
    case "completed":
      return "ended";
    case "matched":
      return new Date(session.end_at) <= now ? "ended" : "matched";
    case "open":
      return new Date(session.end_at) <= now ? "ended" : "recruiting";
  }
}

export type CancelEligibility = { ok: true } | { ok: false; reason: string };

/**
 * PRD v4.10 1.0 規格7、6.0 規格3：場次還沒有人報名時，教練才能取消；有人報名後系統不提供取消，
 * 教練確實無法上課要聯絡平台，由平台取消並全額退款。
 * DB 的 coach_cancel_session() 也檢查「status = open 而且沒有未取消的報名」，這裡先判斷一次讓畫面隱藏按鈕。
 * activeCount 用有效報名人數（待確認開課、訂單成立、課程完成）。
 */
export function canCoachCancelSession(
  session: { status: SessionStatus },
  activeCount: number
): CancelEligibility {
  if (session.status !== "open") {
    return { ok: false, reason: "這個場次目前狀態無法取消" };
  }
  if (activeCount > 0) {
    return { ok: false, reason: "場次已有人報名，無法自行取消，如需取消請聯絡平台" };
  }
  return { ok: true };
}

// 學員名單上的報名狀態文案（PRD 第六章 5.3）
export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending_match: "已報名（待確認開課）",
  confirmed: "訂單成立",
  cancelled: "已取消（未扣款）",
  refunded: "已退款",
  partial_refunded: "部分退款",
  completed: "課程完成",
};
