// 取消與退款（PRD v4.10 6.0）的規則判斷與固定文案。純函式、不碰資料庫：
// 「我的課程」決定要不要顯示取消按鈕、結帳頁顯示取消規則、server action 送出前先判斷；
// 真正的把關與金流狀態變更在資料庫函式 learner_cancel_registration()（20261009000045，用同一組級距與四捨五入）、
// 平台取消 admin_cancel_session()。
//
// 錢怎麼分（PRD v4.10 第六章 5.4）：
// - 報名截止前取消（還沒扣款）：不扣款
// - 報名截止後（已扣款）：開課前 72–48 小時取消收 30%（教練 15／平台 15）、48–24 小時收 50%（25／25），
//   手續費中教練分到的部分不再扣 5% 媒合費
// - 開課前 24 小時內：不能取消、不退款、視同課程完成（教練 95%／平台 5%），名額可免費轉讓（平台不做轉讓功能）
// - 缺席：視為課程完成，不退款
// - 場次有人報名後教練無法上課、天災停課：由平台取消，已扣款者全額退款

import type { RegistrationStatus } from "@/types/database";

/** 學員線上取消的時限：開課前 24 小時以上（和教練取消場次的 48 小時是兩回事） */
export const LEARNER_CANCEL_WINDOW_HOURS = 24;

/** 結帳頁在付款前要顯示的取消與退款規則（PRD 6.0 AC 3，字句依 PRD v4.10） */
export const CANCEL_POLICY_LINES = [
  "報名時不扣款，報名截止時達到開課人數才會確定開課並扣款；未達開課人數會自動取消，不會扣款。",
  "報名截止前可以在「我的課程」免費取消。",
  "報名截止後取消：開課前 72–48 小時收取 30% 取消手續費、退還 70%；開課前 48–24 小時收取 50% 取消手續費、退還 50%。手續費由教練與平台各得一半。",
  "開課前 24 小時內不辦理退款，但可以免費把名額轉讓給親友，請透過行前公告提供的聯絡方式聯繫教練；缺席不予退款。",
] as const;

/** 開課前 24 小時內，取消按鈕改顯示的說明（PRD v4.10 6.0 AC 2、規格 11 名額轉讓） */
export const CANCEL_TOO_LATE_MESSAGE =
  "開課前 24 小時內無法退費，可免費轉讓名額給親友，請透過行前公告提供的聯絡方式聯繫教練";

export type LearnerCancelOutcome = "cancel_unpaid" | "refund_full";

export type LearnerCancelEligibility =
  | {
      ok: true;
      /** cancel_unpaid：已取消（未扣款）；refund_full：已退款（全額） */
      outcome: LearnerCancelOutcome;
    }
  | { ok: false; reason: "too_late" | "not_cancellable"; message: string };

/**
 * @deprecated v4.10 起請改用 calculateLearnerCancel()：它依報名截止時間與距開課時間算出級距與金額。
 * 這支只看「距開課 24 小時以上」，不分級距，也不知道待確認開課報名是否已過截止，
 * 留著只是讓「我的課程」在小柔改接 calculateLearnerCancel() 之前不會壞掉。
 * 注意它的 refund_full 已經不是實際結果（已扣款者現在是部分退款）。
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

/**
 * 資料庫取消／退款函式丟出的訊息 → 給使用者看的文案。
 * 這幾支函式的訊息本來就是中文、可以直接給人看，所以認得的關鍵字就原樣回傳；認不得才用通用訊息，
 * 避免把資料庫內部錯誤直接顯示出去。
 */
const KNOWN_CANCEL_MESSAGES = [
  "請先登入",
  "找不到這筆報名",
  "沒有權限取消這筆報名",
  "開課前 24 小時內無法退費",
  "報名已截止，系統正在確認是否開課",
  "這筆報名目前狀態無法取消",
];

export function cancelErrorMessage(dbMessage: string | undefined): string {
  const message = dbMessage ?? "";
  const known = KNOWN_CANCEL_MESSAGES.find((k) => message.includes(k));
  return known ? message : "操作失敗，請稍後再試。";
}

// ============================================================
// 學員取消的級距與金額（PRD v4.10 6.0、5.4）
// 「我的課程」的取消確認視窗、取消按鈕、server action 都該用 calculateLearnerCancel()，
// 讓畫面顯示的金額和實際退款是同一個公式（資料庫函式之後用同一套規則與四捨五入）。
// ============================================================

/** 報名截止後、開課前 72–48 小時取消：手續費 30%（教練、平台各 15%） */
export const CANCEL_TIER_FAR = { feeRatePercent: 30, coachSharePercent: 15 } as const;
/** 開課前 48–24 小時取消：手續費 50%（教練、平台各 25%） */
export const CANCEL_TIER_NEAR = { feeRatePercent: 50, coachSharePercent: 25 } as const;
/** 級距切點（小時）：>= 48 小時用 30%；24 ≤ 小時 < 48 用 50%；< 24 小時不能取消 */
export const CANCEL_TIER_NEAR_HOURS = 48;
export const CANCEL_NO_REFUND_HOURS = 24;

export type LearnerCancelTier = "free" | "fee_30" | "fee_50";

export type LearnerCancelQuote =
  | {
      ok: true;
      /** free：報名截止前、尚未扣款，不收費；fee_30／fee_50：已扣款，部分退款 */
      tier: LearnerCancelTier;
      /** cancel_unpaid：訂單改為「已取消」；partial_refund：訂單改為「部分退款」 */
      outcome: "cancel_unpaid" | "partial_refund";
      /** 手續費比例（0、0.3、0.5），畫面顯示百分比用 */
      feeRate: number;
      /** 以下金額單位與 amount 相同（NT$ 整數），學員＋教練＋平台＝amount（已扣款時） */
      feeAmount: number;
      refundAmount: number;
      coachShareAmount: number;
      platformShareAmount: number;
    }
  | {
      ok: false;
      reason: "too_late" | "pending_match" | "not_cancellable";
      message: string;
    };

/** 手續費金額：amount × 百分比，四捨五入到整數（整數運算，避免浮點誤差） */
function percentOf(amount: number, percent: number): number {
  return Math.round((amount * percent) / 100);
}

/**
 * 學員取消這筆報名會怎樣：能不能取消、手續費比例與金額、退款金額、教練與平台各得多少。
 *
 * - status 是「待確認開課（pending_match）」且還沒到報名截止：免費取消，不扣款。
 * - status 是「訂單成立（confirmed）」＝已扣款，依距開課時間分級：
 *     ≥ 48 小時（72–48）：手續費 30%（教練 15%、平台 15%）、退 70%
 *     24 ≤ 小時 < 48：手續費 50%（教練 25%、平台 25%）、退 50%
 *     < 24 小時：不能取消（不退款、視同課程完成，名額可自行轉讓），回傳 too_late
 *   剛好 48 小時算 30%、剛好 24 小時算 50%（對學員有利的一邊）。
 * - 已過報名截止但報名還是「待確認開課」：系統正在做開課確認，回傳 pending_match，請稍後再試。
 * - 其他狀態（已取消、已退款、部分退款、課程完成）：not_cancellable。
 * 教練分得的手續費不再扣媒合費（PRD v4.10 6.0）；四捨五入：教練份額先算，平台＝手續費－教練份額，保證加總不差。
 */
export function calculateLearnerCancel(input: {
  /** 報名金額（NT$ 整數） */
  amount: number;
  status: RegistrationStatus;
  /** 場次開始時間（ISO 字串或 Date） */
  sessionStartAt: string | Date;
  /** 報名截止時間（ISO 字串或 Date） */
  registrationDeadlineAt: string | Date;
  now?: Date;
}): LearnerCancelQuote {
  const now = input.now ?? new Date();
  const start = new Date(input.sessionStartAt).getTime();
  const deadline = new Date(input.registrationDeadlineAt).getTime();

  if (input.status === "pending_match") {
    if (now.getTime() < deadline) {
      return {
        ok: true,
        tier: "free",
        outcome: "cancel_unpaid",
        feeRate: 0,
        feeAmount: 0,
        refundAmount: 0,
        coachShareAmount: 0,
        platformShareAmount: 0,
      };
    }
    return {
      ok: false,
      reason: "pending_match",
      message: "報名已截止，系統正在確認是否開課，請稍後再試",
    };
  }

  if (input.status !== "confirmed") {
    return { ok: false, reason: "not_cancellable", message: "這筆報名目前狀態無法取消" };
  }

  const hoursToStart = (start - now.getTime()) / (60 * 60 * 1000);
  if (hoursToStart < CANCEL_NO_REFUND_HOURS) {
    return { ok: false, reason: "too_late", message: CANCEL_TOO_LATE_MESSAGE };
  }

  const tier = hoursToStart >= CANCEL_TIER_NEAR_HOURS ? CANCEL_TIER_FAR : CANCEL_TIER_NEAR;
  const feeAmount = percentOf(input.amount, tier.feeRatePercent);
  const coachShareAmount = percentOf(input.amount, tier.coachSharePercent);
  return {
    ok: true,
    tier: tier === CANCEL_TIER_FAR ? "fee_30" : "fee_50",
    outcome: "partial_refund",
    feeRate: tier.feeRatePercent / 100,
    feeAmount,
    refundAmount: input.amount - feeAmount,
    coachShareAmount,
    platformShareAmount: feeAmount - coachShareAmount,
  };
}
