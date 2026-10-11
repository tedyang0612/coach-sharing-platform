// 報名流程用的資料讀取（Server Component／server action 用）。
// 和 app/courses/_lib/queries.ts 一樣，刻意不放在 "use server" 檔案裡，避免每個 export 都變成公開端點。

import { createClient } from "@/lib/supabase/server";
import type { Course, Registration, Session } from "@/types/database";
import type { RegistrationViewer } from "./registration-rules";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type RegistrationContext = {
  session: Session;
  course: Course;
  /** 已報名人數（status <> cancelled，與資料庫額滿判斷同一個定義） */
  enrolledCount: number;
};

/**
 * 一個場次的報名所需資料：場次、課程、已報名人數。
 * 讀不到（場次不存在、課程沒發布、是範本）時回傳 null；RLS 只讓訪客與學員看到已發布的課程。
 * 報名人數用 get_session_enrollment_counts：registrations 只開放本人與教練 select，
 * 前端自己 count 會漏算別人的報名。
 */
export async function getRegistrationContext(
  supabase: SupabaseServerClient,
  sessionId: string
): Promise<RegistrationContext | null> {
  const { data: session } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session) return null;

  const { data: course } = await supabase.from("courses").select("*").eq("id", session.course_id).maybeSingle();
  if (!course || course.is_template || course.status !== "published") return null;

  const { data: counts } = await supabase.rpc("get_session_enrollment_counts", { p_session_ids: [sessionId] });
  const enrolledCount: number = counts?.[0]?.enrolled_count ?? 0;

  return { session: session as Session, course: course as Course, enrolledCount };
}

export type RegistrationOrder = RegistrationContext & {
  registration: Registration;
};

/**
 * 報名成功頁用：這位學員自己的一筆報名，連同場次、課程與目前報名進度。
 * registrations 的 RLS 只讓本人讀，再加上 learner_id 條件是為了不依賴 RLS 才安全。
 */
export async function getMyRegistrationOrder(
  supabase: SupabaseServerClient,
  registrationId: string,
  userId: string
): Promise<RegistrationOrder | null> {
  const { data: registration } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", registrationId)
    .eq("learner_id", userId)
    .maybeSingle();
  if (!registration) return null;

  const context = await getRegistrationContext(supabase, registration.session_id);
  if (!context) return null;

  return { ...context, registration: registration as Registration };
}

/**
 * 目前瀏覽的人：訪客，或登入使用者（附上他在這個場次有沒有還沒取消的報名）。
 * 用 getUser() 而不是 getSession()：前者會向 Supabase Auth 驗證 token，後者只讀 cookie。
 */
export async function getRegistrationViewer(
  supabase: SupabaseServerClient,
  sessionId: string
): Promise<RegistrationViewer> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "guest" };

  const { data } = await supabase
    .from("registrations")
    .select("id")
    .eq("session_id", sessionId)
    .eq("learner_id", user.id)
    .neq("status", "cancelled")
    .limit(1);

  return { kind: "user", userId: user.id, hasActiveRegistration: (data?.length ?? 0) > 0 };
}
