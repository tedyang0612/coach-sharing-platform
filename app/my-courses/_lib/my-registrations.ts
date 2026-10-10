// 學員後台「我的課程」（13.0）的資料整理。純函式、不碰資料庫：
// 把報名紀錄、場次、課程、公告、自己的評價整理成頁面直接能用的一筆資料，並依狀態分類。
// 頁面（排版）請接 queries.ts 的 listMyRegistrations()，取消按鈕呼叫 app/registrations/actions.ts 的 cancelRegistration()。

import { calculateLearnerCancel, type LearnerCancelQuote } from "@/app/registrations/_lib/cancel-rules";
import { formatOrderNumber } from "@/app/registrations/_lib/registration-rules";
import { getSessionProgress, type SessionProgress } from "@/components/ui/status-indicator";
import type { RegistrationStatus, SessionStatus } from "@/types/database";

/** 畫面分成四類（13.0 AC）：待確認開課／確定開課／已取消／已完成，順序就是頁籤順序 */
export type MyRegistrationCategory = "pending" | "confirmed" | "cancelled" | "completed";

export const MY_REGISTRATION_CATEGORIES: MyRegistrationCategory[] = ["pending", "confirmed", "cancelled", "completed"];

export const MY_REGISTRATION_CATEGORY_LABELS: Record<MyRegistrationCategory, string> = {
  pending: "待確認開課",
  confirmed: "確定開課",
  cancelled: "已取消",
  completed: "已完成",
};

/** 報名狀態 → 分類。已退款、部分退款也歸在「已取消」，細節看 detailLabel */
export function categoryOfRegistration(status: RegistrationStatus): MyRegistrationCategory {
  switch (status) {
    case "pending_match":
      return "pending";
    case "confirmed":
      return "confirmed";
    case "completed":
      return "completed";
    case "cancelled":
    case "refunded":
    case "partial_refunded":
      return "cancelled";
  }
}

/**
 * 每筆報名的狀態說明（PRD 5.3）。「已取消」可能是學員自己取消、場次未達人數取消，或教練取消場次，
 * 學員看到的原因不同，所以要帶場次狀態一起判斷。
 */
export function registrationDetailLabel(
  status: RegistrationStatus,
  sessionStatus: SessionStatus | null,
  refund?: { amount: number; refundAmount: number | null; feeAmount: number | null }
): string {
  switch (status) {
    case "pending_match":
      return "已報名（待確認開課），尚未扣款";
    case "confirmed":
      return "訂單成立（確定開課），已扣款";
    case "completed":
      return "課程完成";
    case "refunded":
      return sessionStatus === "cancelled_by_coach" ? "教練取消場次，已全額退款" : "已退款（全額）";
    case "partial_refunded": {
      // 手續費比例依取消時距開課的時間是 30% 或 50%，所以用實際金額反推，不寫死
      if (!refund || refund.feeAmount === null || refund.amount <= 0) return "已部分退款";
      const feePercent = Math.round((refund.feeAmount / refund.amount) * 100);
      const refunded = refund.refundAmount ?? refund.amount - refund.feeAmount;
      return `已部分退款 NT$${refunded.toLocaleString()}（扣 ${feePercent}% 取消手續費 NT$${refund.feeAmount.toLocaleString()}）`;
    }
    case "cancelled":
      if (sessionStatus === "cancelled_unmatched") return "未達人數取消，不扣款";
      if (sessionStatus === "cancelled_by_coach") return "教練取消場次，不扣款";
      return "已取消（未扣款）";
  }
}

/** 取消按鈕該怎麼呈現：show＝可以點；contact_coach＝開課前 24 小時內，改顯示聯絡教練的說明；hide＝不顯示 */
export type CancelButtonMode = "show" | "contact_coach" | "hide";

export function cancelButtonMode(cancel: LearnerCancelQuote): CancelButtonMode {
  if (cancel.ok) return "show";
  return cancel.reason === "too_late" ? "contact_coach" : "hide";
}

/** 資料庫撈出來、尚未整理的一筆報名 */
export type MyRegistrationRow = {
  id: string;
  status: RegistrationStatus;
  amount: number;
  /** 部分退款的實際退款金額與取消手續費（其他狀態為 null） */
  refund_amount: number | null;
  refund_fee_amount: number | null;
  created_at: string;
  session: {
    id: string;
    start_at: string;
    end_at: string;
    registration_deadline_at: string;
    status: SessionStatus;
    course: {
      id: string;
      title: string;
      sport_type: string;
      location_name: string;
      location_address: string;
      cover_image_url: string | null;
      coach_id: string;
      min_participants: number;
      max_participants: number;
    } | null;
  } | null;
};

export type MyAnnouncement = { id: string; content: string; sent_at: string };
export type MyReview = { rating: number; comment: string | null; created_at: string };

export type MyRegistrationItem = {
  registrationId: string;
  /** 訂單編號，例如 ORD-9F3A21C7 */
  orderNumber: string;
  status: RegistrationStatus;
  category: MyRegistrationCategory;
  /** 狀態的完整說明，例如「教練取消場次，已全額退款」 */
  detailLabel: string;
  amount: number;
  createdAt: string;
  /** 場次或課程讀不到（例如課程已下架）時為 true，標題會是「（課程已下架）」 */
  unavailable: boolean;
  session: { id: string; startAt: string; endAt: string; registrationDeadlineAt: string; status: SessionStatus | null };
  course: {
    id: string;
    title: string;
    sportType: string;
    locationName: string;
    locationAddress: string;
    coverImageUrl: string | null;
    coachId: string | null;
  };
  cancel: LearnerCancelQuote;
  cancelButton: CancelButtonMode;
  /** 教練對這個場次發的公告，新到舊；已取消的報名不顯示（資料庫也看不到） */
  announcements: MyAnnouncement[];
  /** 自己送出的評價；沒評過為 null */
  review: MyReview | null;
  /** 已完成且還沒評價：顯示「前往評價」；已評價的顯示「已評價」 */
  canReview: boolean;
  /** 評價頁網址（牛牛的 5.0 頁面） */
  reviewHref: string;
  /** 待確認開課卡片的「差 N 人開課」進度；其他分類或讀不到人數時為 null */
  groupProgress: { enrolled: number; minParticipants: number; progress: SessionProgress } | null;
};

/** 場次目前報名人數與課程的人數上下限（待確認開課進度條用） */
export type SessionHeadcount = { enrolled: number; minParticipants: number; maxParticipants: number };

export function buildMyRegistrationItem(
  row: MyRegistrationRow,
  announcements: MyAnnouncement[],
  review: MyReview | null,
  now: Date = new Date(),
  headcount: SessionHeadcount | null = null
): MyRegistrationItem {
  const session = row.session;
  const course = session?.course ?? null;
  const category = categoryOfRegistration(row.status);

  // 讀不到場次時給一個一定不能取消的判斷，頁面不會出現壞掉的取消按鈕
  const cancel: LearnerCancelQuote = session
    ? calculateLearnerCancel({
        amount: Number(row.amount),
        status: row.status,
        sessionStartAt: session.start_at,
        registrationDeadlineAt: session.registration_deadline_at,
        now,
      })
    : { ok: false, reason: "not_cancellable", message: "這筆報名目前狀態無法取消" };

  return {
    registrationId: row.id,
    orderNumber: formatOrderNumber(row.id),
    status: row.status,
    category,
    detailLabel: registrationDetailLabel(row.status, session?.status ?? null, {
      amount: Number(row.amount),
      refundAmount: row.refund_amount === null ? null : Number(row.refund_amount),
      feeAmount: row.refund_fee_amount === null ? null : Number(row.refund_fee_amount),
    }),
    amount: Number(row.amount),
    createdAt: row.created_at,
    unavailable: !session || !course,
    session: {
      id: session?.id ?? "",
      startAt: session?.start_at ?? row.created_at,
      endAt: session?.end_at ?? row.created_at,
      registrationDeadlineAt: session?.registration_deadline_at ?? row.created_at,
      status: session?.status ?? null,
    },
    course: {
      id: course?.id ?? "",
      title: course?.title ?? "（課程已下架）",
      sportType: course?.sport_type ?? "",
      locationName: course?.location_name ?? "",
      locationAddress: course?.location_address ?? "",
      coverImageUrl: course?.cover_image_url ?? null,
      coachId: course?.coach_id ?? null,
    },
    cancel,
    cancelButton: cancelButtonMode(cancel),
    announcements: category === "cancelled" ? [] : [...announcements].sort((a, b) => b.sent_at.localeCompare(a.sent_at)),
    review,
    canReview: row.status === "completed" && !review && !!course,
    reviewHref: course ? `/courses/${course.id}/review` : "",
    groupProgress:
      category === "pending" && headcount
        ? { enrolled: headcount.enrolled, minParticipants: headcount.minParticipants, progress: getSessionProgress(headcount) }
        : null,
  };
}

/**
 * 依分類分組。待確認開課、確定開課：開課時間近的在前（快要上課的先看到）；
 * 已完成、已取消：新的在前。
 */
export function groupMyRegistrations(items: MyRegistrationItem[]): Record<MyRegistrationCategory, MyRegistrationItem[]> {
  const groups: Record<MyRegistrationCategory, MyRegistrationItem[]> = {
    pending: [],
    confirmed: [],
    cancelled: [],
    completed: [],
  };
  for (const item of items) groups[item.category].push(item);

  const upcoming = (a: MyRegistrationItem, b: MyRegistrationItem) => a.session.startAt.localeCompare(b.session.startAt);
  const recent = (a: MyRegistrationItem, b: MyRegistrationItem) => b.session.startAt.localeCompare(a.session.startAt);
  groups.pending.sort(upcoming);
  groups.confirmed.sort(upcoming);
  groups.completed.sort(recent);
  groups.cancelled.sort(recent);
  return groups;
}
