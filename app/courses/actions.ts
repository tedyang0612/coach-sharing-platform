"use server";

// 課程上架／編輯／取消場次的 server actions（PRD 1.0）。
// 這個檔案的每個 export 都是可以被直接 POST 的公開端點，所以每支都要自己驗證身分與擁有權，
// 不能假設呼叫者是從我們的表單進來的；前端的 disable／隱藏按鈕只是 UX，這裡才是真正的把關。

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CONTACT_INFO_MESSAGE, containsContactInfo } from "./_lib/contact-filter";
import { COVER_URL_ERROR, isAllowedCoverUrl } from "./_lib/cover-image";
import {
  COURSE_FIELDS,
  computeSessionSlots,
  formDataToCourseValues,
  validateCourseValues,
  type CourseFieldErrors,
  type CourseInput,
} from "./_lib/course-input";
import {
  canRegenerateSessions,
  getCoachContext,
  getMyCourse,
  isCourseEditLocked,
  type CoachContext,
} from "./_lib/queries";
import { canCoachCancelSession, isActiveRegistration } from "./_lib/session-rules";
import type { RegistrationStatus } from "@/types/database";

export type CourseFormState = {
  errors?: CourseFieldErrors & { form?: string };
};

export type SessionActionState = {
  error?: string;
  success?: boolean;
};

type OkCoach = Extract<CoachContext, { ok: true }>;

function notCoachMessage(reason: "unauthenticated" | "not_coach"): string {
  return reason === "unauthenticated" ? "請先登入" : "需通過教練身分審核才能開課";
}

function revalidateCourse(courseId: string) {
  revalidatePath("/coach/courses");
  revalidatePath(`/coach/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

function sessionRows(courseId: string, input: CourseInput) {
  return computeSessionSlots(input).map((slot) => ({
    course_id: courseId,
    start_at: slot.startAt.toISOString(),
    end_at: slot.endAt.toISOString(),
    registration_deadline_at: slot.registrationDeadlineAt.toISOString(),
  }));
}

/** 範本／複製來源必須是自己的課程，否則不記錄來源（避免指到別人已發布的課程） */
async function ownedSourceId(ctx: OkCoach, raw: FormDataEntryValue | null): Promise<string | null> {
  const sourceId = typeof raw === "string" ? raw.trim() : "";
  if (!sourceId) return null;
  const { data } = await ctx.supabase
    .from("courses")
    .select("id")
    .eq("id", sourceId)
    .eq("coach_id", ctx.userId)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * 新增課程。表單的 intent：
 * - "publish"（預設）：建立課程＋切場次＋改為已發布（招生中）
 * - "template"：存成範本，不產生場次、不公開
 * 從範本／複製進來的表單會帶 sourceId，記到 template_source_id。
 *
 * 場次在應用層切，不呼叫 DB 的 generate_sessions_for_course()：那支 function 用 date + time
 * 組 timestamptz 時沒指定時區，會依 DB session timezone（Supabase 預設 UTC）解讀，14:00 會變成台灣時間 22:00。
 */
export async function createCourse(_prev: CourseFormState, formData: FormData): Promise<CourseFormState> {
  const ctx = await getCoachContext();
  if (!ctx.ok) return { errors: { form: notCoachMessage(ctx.reason) } };

  const asTemplate = formData.get("intent") === "template";
  const result = validateCourseValues(formDataToCourseValues(formData), {
    requireFutureDeadline: !asTemplate,
    userId: ctx.userId,
  });
  if (result.errors) return { errors: result.errors };
  const input = result.input;

  const { data: course, error: insertError } = await ctx.supabase
    .from("courses")
    .insert({
      ...input,
      coach_id: ctx.userId,
      // 發布也先用 draft 建立，場次寫入成功後才改成 published，避免學員看到沒有場次的課程
      status: "draft",
      is_template: asTemplate,
      template_source_id: await ownedSourceId(ctx, formData.get("sourceId")),
    })
    .select("id")
    .single();
  if (insertError || !course) return { errors: { form: "儲存失敗，請稍後再試。" } };

  if (asTemplate) {
    revalidatePath("/coach/courses");
    redirect("/coach/courses?view=templates");
  }

  const { error: sessionsError } = await ctx.supabase.from("sessions").insert(sessionRows(course.id, input));
  const { error: publishError } = sessionsError
    ? { error: sessionsError }
    : await ctx.supabase.from("courses").update({ status: "published" }).eq("id", course.id);

  if (publishError) {
    // 沒有交易可以包，失敗就把剛建的課程刪掉（sessions 會跟著 cascade），不留半套資料
    await ctx.supabase.from("courses").delete().eq("id", course.id);
    return { errors: { form: "發布失敗，請稍後再試。" } };
  }

  revalidateCourse(course.id);
  redirect(`/coach/courses/${course.id}`);
}

/**
 * 編輯課程。
 * - 任一場次有有效報名 → 只更新課程須知（notes）與封面圖，其他欄位就算有送也忽略（PRD 系統規則）
 * - 未鎖定且改到日期／時段／課程長度／報名截止 → 重切場次；但只要有任何報名紀錄或非 open 的場次就不允許，
 *   因為刪除舊場次會 cascade 刪掉報名紀錄
 */
export async function updateCourse(_prev: CourseFormState, formData: FormData): Promise<CourseFormState> {
  const ctx = await getCoachContext();
  if (!ctx.ok) return { errors: { form: notCoachMessage(ctx.reason) } };

  const courseId = String(formData.get("courseId") ?? "");
  const course = courseId ? await getMyCourse(ctx, courseId) : null;
  if (!course) return { errors: { form: "找不到這堂課程" } };
  if (course.status === "cancelled") return { errors: { form: "已取消的課程無法編輯" } };

  const values = formDataToCourseValues(formData);

  if (isCourseEditLocked(course)) {
    if (containsContactInfo(values.notes)) return { errors: { notes: CONTACT_INFO_MESSAGE } };
    const coverOk = isAllowedCoverUrl(values.cover_image_url, {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      userId: ctx.userId,
    });
    if (!coverOk) return { errors: { cover_image_url: COVER_URL_ERROR } };
    const { error } = await ctx.supabase
      .from("courses")
      .update({ notes: values.notes || null, cover_image_url: values.cover_image_url || null })
      .eq("id", course.id);
    if (error) return { errors: { form: "儲存失敗，請稍後再試。" } };
    revalidateCourse(course.id);
    redirect(`/coach/courses/${course.id}`);
  }

  const scheduleChanged =
    course.session_date !== values.session_date ||
    course.time_range_start.slice(0, 5) !== values.time_range_start ||
    course.time_range_end.slice(0, 5) !== values.time_range_end ||
    String(course.session_duration_minutes) !== values.session_duration_minutes ||
    String(course.registration_deadline_hours) !== (values.registration_deadline_hours || "24");
  const needsRegenerate = !course.is_template && course.status === "published" && scheduleChanged;

  const result = validateCourseValues(values, { requireFutureDeadline: needsRegenerate, userId: ctx.userId });
  if (result.errors) return { errors: result.errors };
  const input = result.input;

  // corner case：人數上限不可低於已報名人數。未鎖定時理論上每場都是 0 人，這裡是防同時有人報名的第二道防線
  const maxActive = Math.max(0, ...course.sessions.map((s) => s.active_count));
  if (input.max_participants < maxActive) {
    return { errors: { max_participants: `人數上限不可低於已報名人數（${maxActive} 人）` } };
  }

  if (needsRegenerate && !canRegenerateSessions(course)) {
    return { errors: { form: "此課程已有報名紀錄或已處理過的場次，無法調整日期與時段。" } };
  }

  const oldSessionIds = course.sessions.map((s) => s.id);

  // 順序：先寫新場次 → 再改課程 → 最後刪舊場次；任何一步失敗都盡量回到原狀
  if (needsRegenerate) {
    const { data: inserted, error } = await ctx.supabase
      .from("sessions")
      .insert(sessionRows(course.id, input))
      .select("id");
    if (error) return { errors: { form: "儲存失敗，請稍後再試。" } };

    const { error: updateError } = await ctx.supabase.from("courses").update(input).eq("id", course.id);
    if (updateError) {
      await ctx.supabase.from("sessions").delete().in("id", inserted.map((s) => s.id));
      return { errors: { form: "儲存失敗，請稍後再試。" } };
    }

    if (oldSessionIds.length > 0) {
      await ctx.supabase.from("sessions").delete().in("id", oldSessionIds);
    }
  } else {
    const { error } = await ctx.supabase.from("courses").update(input).eq("id", course.id);
    if (error) return { errors: { form: "儲存失敗，請稍後再試。" } };
  }

  revalidateCourse(course.id);
  redirect(course.is_template ? "/coach/courses?view=templates" : `/coach/courses/${course.id}`);
}

/** 把既有課程另存一份範本（不含場次）；之後從範本開課時日期要重新填 */
export async function saveCourseAsTemplate(
  _prev: SessionActionState,
  formData: FormData
): Promise<SessionActionState> {
  const ctx = await getCoachContext();
  if (!ctx.ok) return { error: notCoachMessage(ctx.reason) };

  const courseId = String(formData.get("courseId") ?? "");
  const course = courseId ? await getMyCourse(ctx, courseId) : null;
  if (!course) return { error: "找不到這堂課程" };

  const fields = Object.fromEntries(COURSE_FIELDS.map((f) => [f, course[f]]));

  const { error } = await ctx.supabase.from("courses").insert({
    ...fields,
    latitude: course.latitude,
    longitude: course.longitude,
    city: course.city,
    district: course.district,
    coach_id: ctx.userId,
    status: "draft",
    is_template: true,
    template_source_id: course.id,
  });
  if (error) return { error: "存成範本失敗，請稍後再試。" };

  revalidatePath("/coach/courses");
  return { success: true };
}

/**
 * 教練取消場次（PRD 1.0 規格7）。條件先在這裡用 canCoachCancelSession() 檢查一次（含「尚未成團」的人數判斷，
 * DB function 沒檢查這條），再呼叫 coach_cancel_session()：它會把場次改成 cancelled_by_coach、
 * 報名改成已取消（未扣款）、並發站內＋Email 通知給學員。
 */
export async function cancelSession(_prev: SessionActionState, formData: FormData): Promise<SessionActionState> {
  const ctx = await getCoachContext();
  if (!ctx.ok) return { error: notCoachMessage(ctx.reason) };

  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return { error: "找不到這個場次" };

  const { data: session } = await ctx.supabase
    .from("sessions")
    .select("id, status, start_at, course_id, courses!inner ( coach_id, min_participants ), registrations ( status )")
    .eq("id", sessionId)
    .maybeSingle();

  const course = session?.courses as unknown as { coach_id: string; min_participants: number } | undefined;
  if (!session || !course || course.coach_id !== ctx.userId) return { error: "找不到這個場次" };

  const activeCount = (session.registrations as { status: RegistrationStatus }[]).filter((r) =>
    isActiveRegistration(r.status)
  ).length;
  const eligibility = canCoachCancelSession(session, activeCount, course.min_participants);
  if (!eligibility.ok) return { error: eligibility.reason };

  const { error } = await ctx.supabase.rpc("coach_cancel_session", { p_session_id: sessionId });
  if (error) return { error: "取消場次失敗，請稍後再試。" };

  revalidateCourse(session.course_id);
  return { success: true };
}
