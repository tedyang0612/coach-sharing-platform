// 報名（PRD 3.0）的狀態判斷與固定文案。純函式、不碰資料庫：
// 課程詳情頁用它決定報名按鈕要顯示什麼、能不能按；server action 送出前再跑一次當友善錯誤訊息，
// 真正的把關在資料庫的 guard_registration_insert()（額滿、截止、場次狀態、重複報名、不能報名自己的課）。

import type { SessionStatus } from "@/types/database";

/** 模擬付款的畫面選項（PRD 11.0），只存名稱，不蒐集任何卡號 */
export const PAYMENT_METHODS = ["信用卡", "LINE Pay"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

/** 健康聲明勾選框文案（PRD 3.0 AC1，字句要和 PRD 一致；不蒐集病史） */
export const HEALTH_DECLARATION_LABEL = "我已詳閱並理解上述提醒，確認自身狀況適合參與本課程";

/** 訂單編號（報名成功頁、我的課程顯示用）：資料庫只有 uuid，取前 8 碼大寫，例如 ORD-9F3A21C7 */
export function formatOrderNumber(registrationId: string): string {
  return `ORD-${registrationId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export type RegistrationViewer =
  | { kind: "guest" }
  | {
      kind: "user";
      userId: string;
      /** 這個場次上已經有一筆還沒取消的報名（取消過的不算，可以重新報名） */
      hasActiveRegistration: boolean;
    };

export type RegistrationState =
  | { kind: "can_register" }
  | { kind: "login_required" } // 未登入：按下報名導向登入，登入後回到原頁（PRD 8.0）
  | { kind: "already_registered" }
  | { kind: "own_course" } // 教練不能用學員身分報名自己的課
  | { kind: "full" } // 已額滿
  | { kind: "deadline_passed" } // 報名已截止
  | { kind: "unavailable"; reason: "cancelled" | "ended" | "matched" };

export type RegistrationInput = {
  session: { status: SessionStatus; registration_deadline_at: string; end_at: string };
  course: { coach_id: string; min_participants: number; max_participants: number };
  /** 目前已報名人數（status <> cancelled，和資料庫的額滿定義一致，來源是 get_session_enrollment_counts） */
  enrolledCount: number;
  viewer: RegistrationViewer;
  now?: Date;
};

/**
 * 報名按鈕該呈現哪一種狀態。優先順序：
 * 自己的課 → 已報名 → 場次本身不能報名（取消／結束／已成團）→ 已截止 → 已額滿 → 未登入 → 可報名。
 * 場次已成團時，報名截止的判斷早就做完了，所以顯示「報名已截止」會比「已成團」更貼近學員看到的意思，
 * 這裡仍把它獨立回傳，讓頁面自己決定文案。
 */
export function getRegistrationState({
  session,
  course,
  enrolledCount,
  viewer,
  now = new Date(),
}: RegistrationInput): RegistrationState {
  if (viewer.kind === "user" && viewer.userId === course.coach_id) return { kind: "own_course" };
  if (viewer.kind === "user" && viewer.hasActiveRegistration) return { kind: "already_registered" };

  if (session.status === "cancelled" || session.status === "cancelled_by_coach" || session.status === "cancelled_unmatched") {
    return { kind: "unavailable", reason: "cancelled" };
  }
  if (session.status === "completed" || new Date(session.end_at) <= now) {
    return { kind: "unavailable", reason: "ended" };
  }
  if (session.status === "matched") return { kind: "unavailable", reason: "matched" };

  if (new Date(session.registration_deadline_at) <= now) return { kind: "deadline_passed" };
  if (enrolledCount >= course.max_participants) return { kind: "full" };

  if (viewer.kind === "guest") return { kind: "login_required" };
  return { kind: "can_register" };
}

export const REGISTRATION_BUTTON_LABELS: Record<RegistrationState["kind"], string> = {
  can_register: "立即報名",
  login_required: "登入後報名",
  already_registered: "你已報名",
  own_course: "這是你開設的課程",
  full: "已額滿",
  deadline_passed: "報名已截止",
  unavailable: "目前無法報名",
};

/** 只有這兩種狀態，按鈕才是可以點的 */
export function isRegistrationActionable(state: RegistrationState): boolean {
  return state.kind === "can_register" || state.kind === "login_required";
}

export type RecruitProgress = {
  reachedMin: boolean;
  /** 還差幾人達開課人數（已達為 0） */
  remainingToMin: number;
  /** 還剩幾個名額（額滿為 0） */
  spotsLeft: number;
};

/** 報名進度（PRD 3.0 規格3、4）：卡片與詳情頁共用，已報名人數達下限就標示「已達開課人數」 */
export function getRecruitProgress(
  enrolledCount: number,
  course: { min_participants: number; max_participants: number }
): RecruitProgress {
  return {
    reachedMin: enrolledCount >= course.min_participants,
    remainingToMin: Math.max(0, course.min_participants - enrolledCount),
    spotsLeft: Math.max(0, course.max_participants - enrolledCount),
  };
}

export function recruitProgressLabel(progress: RecruitProgress): string {
  return progress.reachedMin ? "已達開課人數" : `差 ${progress.remainingToMin} 人開課`;
}

/**
 * 資料庫 guard_registration_insert() 擋下時丟出的訊息 → 給學員看的文案。
 * 比對訊息關鍵字而不是整句，之後資料庫文案微調也還認得；認不得就回傳通用訊息。
 */
export function registrationErrorMessage(dbMessage: string | undefined, dbCode?: string): string {
  const message = dbMessage ?? "";
  if (dbCode === "23505") return "你已經報名過這個場次了";
  if (message.includes("額滿")) return "這個場次剛剛已額滿，無法報名";
  if (message.includes("截止")) return "這個場次已超過報名截止時間";
  if (message.includes("自己開設")) return "不能報名自己開設的課程";
  if (message.includes("無法報名") || message.includes("場次不存在")) return "這個場次目前無法報名";
  return "報名失敗，請稍後再試。";
}
