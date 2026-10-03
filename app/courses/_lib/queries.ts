// 課程資料讀取（Server Component／server action 用）。
// 刻意不放在 "use server" 檔案裡：那種檔案的每個 export 都會變成可被直接 POST 的端點，讀取函式不需要曝露出去。
// 這支 import 了 lib/supabase/server（next/headers），被 client component 引用時會直接編譯失敗。

import { createClient } from "@/lib/supabase/server";
import type { Course, RegistrationStatus, Session } from "@/types/database";
import { isActiveRegistration } from "./session-rules";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type CoachContext =
  | { ok: true; supabase: SupabaseServerClient; userId: string }
  | { ok: false; reason: "unauthenticated" | "not_coach"; supabase: SupabaseServerClient };

/**
 * 目前登入者是否為審核通過的教練。profiles 沒有 role 欄位，身分看 coach_profiles.application_status（見 CLAUDE.md）。
 * 用 getUser() 而不是 getSession()：前者會向 Supabase Auth 驗證 token，後者只讀 cookie。
 */
export async function getCoachContext(): Promise<CoachContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated", supabase };

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select("application_status")
    .eq("id", user.id)
    .maybeSingle();
  if (coach?.application_status !== "approved") return { ok: false, reason: "not_coach", supabase };

  return { ok: true, supabase, userId: user.id };
}

export type RosterEntry = {
  id: string;
  status: RegistrationStatus;
  created_at: string;
  // 只拿暱稱：PRD 1.0 AC 名單不顯示學員聯絡方式
  display_name: string;
};

export type SessionWithRoster = Session & {
  active_count: number;
  roster: RosterEntry[];
};

export type CourseWithSessions = Course & {
  sessions: SessionWithRoster[];
};

// learner:profiles(display_name) —— registrations.learner_id 只有一條 FK 指到 profiles，可以直接用表名 embed
const COURSE_WITH_SESSIONS_SELECT = `
  *,
  sessions (
    *,
    registrations ( id, status, created_at, learner:profiles ( display_name ) )
  )
`;

type RawRegistration = {
  id: string;
  status: RegistrationStatus;
  created_at: string;
  learner: { display_name: string } | null;
};
type RawCourse = Course & { sessions: (Session & { registrations: RawRegistration[] })[] };

function shapeCourse(raw: RawCourse): CourseWithSessions {
  const sessions = [...(raw.sessions ?? [])]
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
    .map(({ registrations, ...session }) => {
      const roster = [...(registrations ?? [])]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((r) => ({
          id: r.id,
          status: r.status,
          created_at: r.created_at,
          display_name: r.learner?.display_name ?? "（未命名）",
        }));
      return {
        ...session,
        roster,
        active_count: roster.filter((r) => isActiveRegistration(r.status)).length,
      };
    });
  return { ...raw, sessions };
}

/** 教練自己發布／草稿的課程（不含範本），含各場次即時報名人數與名單 */
export async function listMyCourses(ctx: Extract<CoachContext, { ok: true }>): Promise<CourseWithSessions[]> {
  const { data, error } = await ctx.supabase
    .from("courses")
    .select(COURSE_WITH_SESSIONS_SELECT)
    .eq("coach_id", ctx.userId)
    .eq("is_template", false)
    .order("session_date", { ascending: false });
  if (error) throw error;
  return (data as RawCourse[]).map(shapeCourse);
}

export async function listMyTemplates(ctx: Extract<CoachContext, { ok: true }>): Promise<Course[]> {
  const { data, error } = await ctx.supabase
    .from("courses")
    .select("*")
    .eq("coach_id", ctx.userId)
    .eq("is_template", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Course[];
}

/**
 * 單一課程（含場次與名單），只回傳屬於這位教練的課程。
 * RLS 讓所有人都讀得到「已發布」的課程，所以這裡一定要再比對 coach_id，不能只靠 RLS。
 */
export async function getMyCourse(
  ctx: Extract<CoachContext, { ok: true }>,
  courseId: string
): Promise<CourseWithSessions | null> {
  const { data, error } = await ctx.supabase
    .from("courses")
    .select(COURSE_WITH_SESSIONS_SELECT)
    .eq("id", courseId)
    .eq("coach_id", ctx.userId)
    .maybeSingle();
  if (error) throw error;
  return data ? shapeCourse(data as RawCourse) : null;
}

/**
 * 編輯鎖定（PRD 系統規則）：任一場次有有效報名 → 時段／地點／價格／人數全部鎖住，只能改課程須知（QA）。
 * 這些欄位都在 course 層級，所以是整門課一起鎖，不是單一場次。
 */
export function isCourseEditLocked(course: CourseWithSessions): boolean {
  return course.sessions.some((s) => s.active_count > 0);
}

/**
 * 能不能重切場次：所有場次都還是 open，且完全沒有任何報名紀錄（含已取消／已退款）。
 * 重切會刪掉舊場次，registrations 對 sessions 是 on delete cascade，有紀錄就刪下去會連帶把報名歷史一起刪掉。
 */
export function canRegenerateSessions(course: CourseWithSessions): boolean {
  return course.sessions.every((s) => s.status === "open" && s.roster.length === 0);
}
