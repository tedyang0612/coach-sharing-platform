"use server";

// 報名的 server action（PRD 3.0）。
// 這個檔案的每個 export 都是可以被直接 POST 的公開端點，所以身分、場次狀態都要在這裡自己驗證，
// 不能假設呼叫者是從我們的表單進來的；前端的 disable 按鈕只是 UX，真正的把關在資料庫的
// guard_registration_insert()（額滿、截止、場次狀態、重複報名、不能報名自己的課）。

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getRegistrationContext, getRegistrationViewer } from "./_lib/queries";
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
  return { ok: true, registrationId: data.id };
}
