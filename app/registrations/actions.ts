"use server";

// 報名的 server action（PRD 3.0）。
// 這個檔案的每個 export 都是可以被直接 POST 的公開端點，所以身分、場次狀態都要在這裡自己驗證，
// 不能假設呼叫者是從我們的表單進來的；前端的 disable 按鈕只是 UX，真正的把關在資料庫的
// guard_registration_insert()（額滿、截止、場次狀態、重複報名、不能報名自己的課）。

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SessionStatus } from "@/types/database";
import {
  cancelErrorMessage,
  getCoachAssistRefundEligibility,
  getLearnerCancelEligibility,
} from "./_lib/cancel-rules";
import { getRegistrationContext, getRegistrationViewer } from "./_lib/queries";
import { registrationSuccessHref } from "./_lib/routes";
import {
  getRegistrationState,
  isPaymentMethod,
  registrationErrorMessage,
  type RegistrationState,
} from "./_lib/registration-rules";

export type RegistrationActionState = {
  ok?: true;
  registrationId?: string;
  error?: string;
};

const STATE_MESSAGES: Record<Exclude<RegistrationState["kind"], "can_register">, string> = {
  login_required: "請先登入再報名",
  already_registered: "你已經報名過這個場次了",
  own_course: "不能報名自己開設的課程",
  full: "這個場次已額滿，無法報名",
  deadline_passed: "這個場次已超過報名截止時間",
  unavailable: "這個場次目前無法報名",
};

/**
 * 學員在模擬結帳頁按下「模擬付款」後呼叫：建立一筆「已報名（待成團）」的報名，此時不扣款，
 * 成團（報名截止）時才由排程扣款。表單欄位：
 * - session_id：要報名的場次
 * - health_declaration：必須勾選健康聲明（"on"）
 * - payment_method：畫面上選的付款方式（只存名稱，不蒐集卡號）
 */
export async function createRegistration(
  _prev: RegistrationActionState,
  formData: FormData
): Promise<RegistrationActionState> {
  const sessionId = String(formData.get("session_id") ?? "").trim();
  const paymentMethod = String(formData.get("payment_method") ?? "").trim();

  if (!sessionId) return { error: "找不到要報名的場次" };
  if (formData.get("health_declaration") !== "on") return { error: "請先勾選健康聲明" };
  if (!isPaymentMethod(paymentMethod)) return { error: "請選擇付款方式" };

  const supabase = await createClient();
  const viewer = await getRegistrationViewer(supabase, sessionId);
  if (viewer.kind === "guest") return { error: STATE_MESSAGES.login_required };

  const context = await getRegistrationContext(supabase, sessionId);
  if (!context) return { error: "找不到這個場次" };

  // 先在應用層判斷一次，讓學員看到明確的原因；資料庫的 trigger 才是最後一道把關
  const state = getRegistrationState({
    session: context.session,
    course: context.course,
    enrolledCount: context.enrolledCount,
    viewer,
  });
  if (state.kind !== "can_register") return { error: STATE_MESSAGES[state.kind] };

  const { data, error } = await supabase
    .from("registrations")
    .insert({
      session_id: sessionId,
      learner_id: viewer.userId,
      health_declaration_agreed: true,
      payment_method: paymentMethod,
      // amount、status 由資料庫的 trigger 決定（報名當下的每人費用、待成團），不接受前端傳入
    })
    .select("id")
    .single();

  if (error || !data) return { error: registrationErrorMessage(error?.message, error?.code) };

  revalidatePath(`/courses/${context.course.id}`);
  revalidatePath("/my-courses");
  // 在伺服器端直接導到報名成功頁。不能只回傳 { ok } 讓畫面自己跳轉：報名完成後目前這頁（/registrations/new）會被重新讀取，
  // 這時學員已經報名了，頁面會換成「已報名」的簡單提示、結帳畫面被卸載，跳轉的程式就沒機會執行（停在 /registrations/new）。
  redirect(registrationSuccessHref(data.id));
}

export type CancelActionState = {
  ok?: true;
  error?: string;
};

/**
 * 學員在「我的課程」取消自己的報名（PRD 6.0）。開課前 24 小時以上才能取消：
 * 尚未扣款（待成團）→ 已取消、不扣款；已扣款（訂單成立）→ 已退款、全額退回，名額即時釋出。
 * 狀態變更與通知由資料庫函式 learner_cancel_registration() 一次完成，這裡先判斷一次給明確的錯誤訊息。
 */
export async function cancelRegistration(registrationId: string): Promise<CancelActionState> {
  if (!registrationId) return { error: "找不到這筆報名" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請先登入" };

  // learner_id 條件不依賴 RLS，確保只處理自己的報名
  const { data: registration } = await supabase
    .from("registrations")
    .select("id, status, session:sessions(start_at, course_id)")
    .eq("id", registrationId)
    .eq("learner_id", user.id)
    .maybeSingle();
  if (!registration) return { error: "找不到這筆報名" };

  const session = registration.session as unknown as { start_at: string; course_id: string } | null;
  if (!session) return { error: "找不到這筆報名的場次" };

  const eligibility = getLearnerCancelEligibility(registration, session);
  if (!eligibility.ok) return { error: eligibility.message };

  const { error } = await supabase.rpc("learner_cancel_registration", { p_registration_id: registrationId });
  if (error) return { error: cancelErrorMessage(error.message) };

  revalidatePath("/my-courses");
  revalidatePath(`/courses/${session.course_id}`);
  revalidatePath(`/coach/courses/${session.course_id}`);
  return { ok: true };
}

/**
 * 教練協助退款（PRD 6.0）：開課前 24 小時內學員不能自己取消，由該場次的教練在課程管理頁操作，
 * 退 50%，另外 50% 是取消手續費：25% 給教練（取消補償，列入待撥款）、25% 歸平台。資料庫函式 coach_assist_refund() 會檢查「是該場次的教練」與
 * 「報名已扣款」，這裡先判斷課程是否還沒結束，並給明確的錯誤訊息。
 */
export async function coachAssistRefund(registrationId: string): Promise<CancelActionState> {
  if (!registrationId) return { error: "找不到這筆報名" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請先登入" };

  // 教練只讀得到自己場次的報名（RLS）；再比對課程的教練，不只靠 RLS
  const { data: registration } = await supabase
    .from("registrations")
    .select("id, status, session:sessions(end_at, status, course_id, course:courses(coach_id))")
    .eq("id", registrationId)
    .maybeSingle();
  if (!registration) return { error: "找不到這筆報名" };

  const session = registration.session as unknown as {
    end_at: string;
    status: SessionStatus;
    course_id: string;
    course: { coach_id: string } | null;
  } | null;
  if (!session || session.course?.coach_id !== user.id) return { error: "只有該場次的教練可以協助退款" };

  const eligibility = getCoachAssistRefundEligibility(registration, session);
  if (!eligibility.ok) return { error: eligibility.message };

  const { error } = await supabase.rpc("coach_assist_refund", { p_registration_id: registrationId });
  if (error) return { error: cancelErrorMessage(error.message) };

  revalidatePath("/my-courses");
  revalidatePath(`/coach/courses/${session.course_id}`);
  return { ok: true };
}
