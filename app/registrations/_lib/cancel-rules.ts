// 取消與退款（PRD 6.0）的規則判斷與固定文案。純函式、不碰資料庫：
// 「我的課程」決定要不要顯示取消按鈕、結帳頁顯示取消規則、server action 送出前先判斷；
// 真正的把關與金流狀態變更在資料庫函式 learner_cancel_registration()（20261003000030）、
// coach_assist_refund()（20261005000040）。
//
// 錢怎麼分（PRD v4.7 第六章 5.4）：
// - 報名截止前取消（還沒扣款）：不扣款
// - 已扣款、開課 24 小時前取消：全額退款
// - 開課 24 小時內：學員不能自己取消，要聯絡教練協助退款，退 50%；另外 50% 是取消手續費，
//   其中 25% 給教練（時間與場地成本補償，列入待撥款）、25% 歸平台
// - 缺席：視為課程完成，不退款

import type { RegistrationStatus, SessionStatus } from "@/types/database";

/** 學員線上取消的時限：開課前 24 小時以上（和教練取消場次的 48 小時是兩回事） */
export const LEARNER_CANCEL_WINDOW_HOURS = 24;
/** 開課 24 小時內由教練協助退款時，取消手續費佔課程費用的比例（學員拿回其餘的 50%） */
export const COACH_ASSIST_REFUND_FEE_RATE = 0.5;
/** 手續費中教練分得的比例（佔課程費用，取消補償）；其餘歸平台 */
export const COACH_ASSIST_COACH_SHARE_RATE = 0.25;

/** 結帳頁在付款前要顯示的取消與退款規則（PRD 6.0 AC 3，字句依 PRD） */
export const CANCEL_POLICY_LINES = [
  "報名時不扣款，報名截止時達到開課人數才會確定開課並扣款；未達開課人數會自動取消，不會扣款。",
  "開課前 24 小時以上可以在「我的課程」取消：尚未扣款者不扣款，已確定開課並扣款者全額退款。",
  "開課前 24 小時內不能自行取消，如需取消請聯絡該堂教練協助處理，將收取 50% 取消手續費；缺席不予退款。",
] as const;

/** 開課前 24 小時內，取消按鈕改顯示的說明（PRD 6.0 AC 2） */
export const CANCEL_TOO_LATE_MESSAGE =
  "開課前 24 小時內，如需取消，請聯絡該堂教練協助處理，將收取 50% 取消手續費，缺席不予退款";

export type LearnerCancelOutcome = "cancel_unpaid" | "refund_full";

export type LearnerCancelEligibility =
  | {
      ok: true;
      /** cancel_unpaid：已取消（未扣款）；refund_full：已退款（全額） */
      outcome: LearnerCancelOutcome;
    }
  | { ok: false; reason: "too_late" | "not_cancellable"; message: string };

/**
 * 學員能不能取消這筆報名。條件和資料庫的 learner_cancel_registration() 一致：
 * 距開課還有 24 小時以上，而且報名狀態是「待確認開課」或「訂單成立」。
 */
export function getLearnerCancelEligibility(
  registration: { status: RegistrationStatus },
  session: { start_at: string },
  now: Date = new Date()
): LearnerCancelEligibility {
  if (registration.status !== "pending_match" && registration.status !== "confirmed") {
    return { ok: false, reason: "not_cancellable", message: "這筆報名目前狀態無法取消" };
  }

  const cancelDeadline = new Date(session.start_at).getTime() - LEARNER_CANCEL_WINDOW_HOURS * 60 * 60 * 1000;
  if (now.getTime() > cancelDeadline) {
    return { ok: false, reason: "too_late", message: CANCEL_TOO_LATE_MESSAGE };
  }

  return { ok: true, outcome: registration.status === "confirmed" ? "refund_full" : "cancel_unpaid" };
}

export const CANCEL_OUTCOME_LABELS: Record<LearnerCancelOutcome, string> = {
  cancel_unpaid: "取消後訂單改為「已取消」，尚未扣款，名額會釋出",
  refund_full: "取消後訂單改為「已退款」，款項全額退回，名額會釋出",
};

export type CoachAssistRefundEligibility = { ok: true } | { ok: false; message: string };

/**
 * 教練能不能協助退款：只有已扣款（訂單成立）、而且課程還沒結束的報名。
 * 資料庫只檢查「是該場次的教練、狀態是 confirmed」；PRD 的情境是開課 24 小時內學員不能自己取消，
 * 這時才需要教練出面，所以頁面可以用 isWithinLearnerCancelBlock() 決定要不要主動顯示這顆按鈕。
 */
export function getCoachAssistRefundEligibility(
  registration: { status: RegistrationStatus },
  session: { end_at: string; status: SessionStatus },
  now: Date = new Date()
): CoachAssistRefundEligibility {
  if (registration.status !== "confirmed") {
    return { ok: false, message: "只有已扣款（訂單成立）的報名才能協助退款" };
  }
  if (session.status === "completed" || new Date(session.end_at) <= now) {
    return { ok: false, message: "課程已經結束，無法協助退款" };
  }
  return { ok: true };
}

/** 距開課不到 24 小時、學員已經不能自己取消（教練協助退款的情境） */
export function isWithinLearnerCancelBlock(session: { start_at: string }, now: Date = new Date()): boolean {
  return now.getTime() > new Date(session.start_at).getTime() - LEARNER_CANCEL_WINDOW_HOURS * 60 * 60 * 1000;
}

/**
 * 教練協助退款的金額（分），與資料庫 coach_assist_refund() 一致：
 * 手續費 = round(amount * 0.50)，學員拿回其餘；教練的取消補償 = round(amount * 0.25)，其餘手續費歸平台，
 * 所以 學員 + 教練 + 平台 一定剛好等於原金額。
 */
export function coachAssistRefundAmounts(amountCents: number): {
  fee: number;
  refund: number;
  coachShare: number;
  platformShare: number;
} {
  const fee = Math.round(amountCents * COACH_ASSIST_REFUND_FEE_RATE);
  const coachShare = Math.round(amountCents * COACH_ASSIST_COACH_SHARE_RATE);
  return { fee, refund: amountCents - fee, coachShare, platformShare: fee - coachShare };
}

/**
 * 資料庫取消／退款函式丟出的訊息 → 給使用者看的文案。
 * 這幾支函式的訊息本來就是中文、可以直接給人看，所以認得的關鍵字就原樣回傳；認不得才用通用訊息，
 * 避免把資料庫內部錯誤直接顯示出去。
 */
const KNOWN_CANCEL_MESSAGES = [
  "請先登入",
  "找不到這筆報名",
  "沒有權限取消這筆報名",
  "開課前 24 小時內無法自行取消",
  "這筆報名目前狀態無法取消",
  "只有該場次的教練可以協助退款",
  "只有已扣款（訂單成立）的報名才能協助退款",
];

export function cancelErrorMessage(dbMessage: string | undefined): string {
  const message = dbMessage ?? "";
  const known = KNOWN_CANCEL_MESSAGES.find((k) => message.includes(k));
  return known ? message : "操作失敗，請稍後再試。";
}
