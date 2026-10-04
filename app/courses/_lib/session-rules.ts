// 場次狀態顯示、教練取消場次、編輯鎖定的規則。純函式，頁面（顯示按鈕與否）和 server action（實際把關）共用。

import type { RegistrationStatus, SessionStatus } from "@/types/database";

// 「有效報名」＝還佔著名額的報名。cancelled／refunded／partial_refunded 都是已經退出的學員。
export const ACTIVE_REGISTRATION_STATUSES: RegistrationStatus[] = ["pending_match", "confirmed", "completed"];

export function isActiveRegistration(status: RegistrationStatus): boolean {
  return ACTIVE_REGISTRATION_STATUSES.includes(status);
}

export const CANCEL_WINDOW_HOURS = 48;

// PRD 1.0 規格4：教練工作台「我的課程」依狀態分組
export type SessionDisplayStatus = "recruiting" | "matched" | "ended" | "cancelled";

export const SESSION_DISPLAY_LABELS: Record<SessionDisplayStatus, string> = {
  recruiting: "招生中",
  matched: "已成團",
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
 * PRD 1.0 規格7：開課前 48hr 以上且尚未成團，教練才能取消場次。
 * 「尚未成團」在 3.0 做完前先用「有效報名人數 < 人數下限」簡化判斷（見 task 文件 corner case）；
 * DB 的 coach_cancel_session() 只檢查 status=open 跟 48hr，所以人數這條要在應用層擋。
 */
export function canCoachCancelSession(
  session: { status: SessionStatus; start_at: string },
  activeCount: number,
  minParticipants: number,
  now: Date = new Date()
): CancelEligibility {
  if (session.status !== "open") {
    return { ok: false, reason: "這個場次目前狀態無法取消" };
  }
  const hoursUntilStart = (new Date(session.start_at).getTime() - now.getTime()) / (60 * 60 * 1000);
  if (hoursUntilStart < CANCEL_WINDOW_HOURS) {
    return { ok: false, reason: `開課前 ${CANCEL_WINDOW_HOURS} 小時內無法取消場次` };
  }
  if (activeCount >= minParticipants) {
    return { ok: false, reason: "這個場次已達開課人數，無法取消" };
  }
  return { ok: true };
}
