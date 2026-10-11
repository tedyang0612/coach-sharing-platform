"use server";

import { revalidatePath } from "next/cache";
import {
  ACTIVE_REGISTRATION_STATUSES,
  ANNOUNCEMENT_MAX_LENGTH,
} from "@/lib/announcements/constants";
import { contactInfoWarning } from "@/lib/coach-application/validation";
import { createClient } from "@/lib/supabase/server";

export type AnnouncementPayload = {
  sessionId: string;
  content: string;
};

export type AnnouncementResult = { ok: true } | { ok: false; error: string };

/**
 * 教練對單一場次的報名學員群發公告（PRD 7.0 規格 4）。
 * 寫入 announcements 之後，資料庫的 trigger 會替每位學員建立通知（站內＋Email 紀錄）。
 */
export async function sendAnnouncement(
  payload: AnnouncementPayload
): Promise<AnnouncementResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "登入已過期，請重新登入後再發送。" };

  const content = payload.content.trim();
  if (!content) return { ok: false, error: "請輸入公告內容。" };
  if (Array.from(content).length > ANNOUNCEMENT_MAX_LENGTH) {
    return { ok: false, error: `公告內容最多 ${ANNOUNCEMENT_MAX_LENGTH} 個字。` };
  }
  // 公告不可填寫聯絡資訊，聯絡方式統一由行前公告提供
  const contactWarning = contactInfoWarning(content);
  if (contactWarning) return { ok: false, error: contactWarning };

  // 只能對自己開設的課程底下的場次發公告（PRD 7.0 AC 4）
  const { data: session } = await supabase
    .from("sessions")
    .select("id, courses!inner(coach_id)")
    .eq("id", payload.sessionId)
    .maybeSingle();
  // 巢狀查詢的結果型別依關聯方向可能是物件或陣列，兩種都處理
  const course = session
    ? ([session.courses].flat()[0] as { coach_id: string } | undefined)
    : undefined;
  if (!session || !course || course.coach_id !== user.id) {
    return { ok: false, error: "找不到這個場次，或你不是這堂課的教練。" };
  }

  // 沒有有效報名就不能發（PRD 7.0 AC 4：有有效訂單的場次）
  const { count } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("session_id", session.id)
    .in("status", ACTIVE_REGISTRATION_STATUSES);
  if (!count) {
    return { ok: false, error: "這個場次目前沒有報名學員，無法發送公告。" };
  }

  const { error } = await supabase.from("announcements").insert({
    session_id: session.id,
    coach_id: user.id,
    content,
  });
  if (error) return { ok: false, error: "公告發送失敗，請稍後再試。" };

  revalidatePath(`/coach/sessions/${session.id}/announcements`);
  return { ok: true };
}
