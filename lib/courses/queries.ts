import { createClient } from "@/lib/supabase/server";
import { resolveCoverUrl } from "@/app/courses/_lib/cover-image";
import type { CourseLevel, SessionStatus } from "@/types/database";
import type { AnnouncementItem } from "@/components/announcements/announcement-history";
import type { Course, CourseQaItem } from "./types";

// 學員端讀課程與場次（未登入也讀得到：RLS 只開放已發布的課程）。
// 欄位一律明確列出，不用 select("*")；教練的審核與聯絡欄位不會被帶出來。
// 注意：這支 import 了 lib/supabase/server，只能在 Server Component 使用。

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const SESSION_SELECT = `
  id, course_id, start_at, end_at, registration_deadline_at, status,
  courses!inner (
    id, coach_id, title, description, notes, sport_type, level,
    location_name, location_address, price_per_person, cover_image_url,
    min_participants, max_participants, status, is_template,
    districts ( city, district )
  )
`;

interface RawSession {
  id: string;
  course_id: string;
  start_at: string;
  end_at: string;
  registration_deadline_at: string;
  status: SessionStatus;
  courses: {
    id: string;
    coach_id: string;
    title: string;
    description: string | null;
    notes: string | null;
    sport_type: string;
    level: CourseLevel;
    location_name: string;
    location_address: string;
    price_per_person: number;
    cover_image_url: string | null;
    min_participants: number;
    max_participants: number;
    districts: { city: string; district: string } | null;
  };
}

interface RawCoach {
  id: string;
  display_name: string;
  photo_url: string | null;
  is_verified: boolean;
  tags: string[] | null;
  avg_rating: number | null;
  review_count: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 場次還能報名的狀態：招生中、已達開課人數（已成團）。其他（取消、已結束）不列在列表
const LISTED_STATUSES: SessionStatus[] = ["open", "matched"];

async function fetchCoaches(supabase: SupabaseServerClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, RawCoach>();
  // 教練名稱用 coach_profiles.display_name（暱稱優先），不要用 profiles.display_name
  const { data, error } = await supabase
    .from("coach_profiles")
    .select("id, display_name, photo_url, is_verified, tags, avg_rating, review_count")
    .in("id", ids);
  // 讀不到教練資料時課程仍要能顯示（名稱會是空白），但要留下紀錄才知道是權限還是欄位的問題
  if (error) console.error("讀取教練資料失敗：", error.message);
  return new Map((data as RawCoach[] | null)?.map((c) => [c.id, c]));
}

// 每個場次的有效報名人數；RPC 一次最多 200 個場次，所以分批查
export async function fetchEnrollmentCounts(
  supabase: SupabaseServerClient,
  sessionIds: string[],
) {
  const counts = new Map<string, number>();
  for (let i = 0; i < sessionIds.length; i += 200) {
    const { data } = await supabase.rpc("get_session_enrollment_counts", {
      p_session_ids: sessionIds.slice(i, i + 200),
    });
    for (const row of (data ?? []) as { session_id: string; enrolled_count: number }[]) {
      counts.set(row.session_id, row.enrolled_count);
    }
  }
  return counts;
}

function toCourseCard(
  s: RawSession,
  coach: RawCoach | undefined,
  enrolled: number,
): Course {
  const c = s.courses;
  return {
    id: s.id,
    courseId: c.id,
    title: c.title,
    sport: c.sport_type,
    city: c.districts?.city ?? "",
    district: c.districts?.district ?? "",
    venue: c.location_name,
    startsAt: s.start_at,
    endsAt: s.end_at,
    level: c.level,
    coachId: c.coach_id,
    // 教練名稱沒填（或讀不到）時顯示「教練」，避免畫面出現空白
    coachName: coach?.display_name?.trim() || "教練",
    coachVerified: coach?.is_verified ?? false,
    coachTags: coach?.tags ?? [],
    coachRating: coach?.avg_rating ?? null,
    coachReviewCount: coach?.review_count ?? 0,
    price: c.price_per_person,
    enrolled,
    minToOpen: c.min_participants,
    capacity: c.max_participants,
  };
}

// 列表：一個場次一筆；已開始與已取消的場次不列出
export async function listCourseCards(now: Date = new Date()): Promise<Course[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .in("status", LISTED_STATUSES)
    .gt("start_at", now.toISOString())
    .eq("courses.status", "published")
    .eq("courses.is_template", false)
    .order("start_at");
  if (error) throw error;
  const sessions = (data ?? []) as unknown as RawSession[];

  const [coaches, counts] = await Promise.all([
    fetchCoaches(supabase, [...new Set(sessions.map((s) => s.courses.coach_id))]),
    fetchEnrollmentCounts(supabase, sessions.map((s) => s.id)),
  ]);
  return sessions.map((s) =>
    toCourseCard(s, coaches.get(s.courses.coach_id), counts.get(s.id) ?? 0),
  );
}

export interface CourseSession {
  id: string;
  startsAt: string; // ISO 8601
  endsAt: string;
  enrolled: number;
  status: "open" | "cancelled";
  // 報名按鈕狀態（getRegistrationState）要用的原始欄位
  registrationDeadlineAt: string;
  rawStatus: SessionStatus;
}

export interface CourseDetail extends Course {
  description: string;
  notes: string | null;
  // TODO: 等 Ted 確認課程 Q&A 的資料來源後，在 getCourseWithSessions 裡帶出；沒有填寫就不顯示
  qa?: CourseQaItem[];
  address: string;
  // 封面圖：沒設定時依運動項目帶預設圖（Ted 的 resolveCoverUrl）
  coverUrl: string;
  // 教練大頭貼（授課教練卡用）；沒有就顯示淡藍圓形
  coachPhotoUrl: string | null;
  status: "published";
  sessions: CourseSession[];
}

// 詳情：課程本身加上所有場次（含已取消的，頁面再決定怎麼顯示）；找不到或沒公開回 null
export async function getCourseWithSessions(courseId: string): Promise<CourseDetail | null> {
  // 網址亂打的 id 不是 uuid 時資料庫會報錯（變成 500），這裡先擋掉，頁面顯示 404
  if (!UUID_PATTERN.test(courseId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("course_id", courseId)
    .eq("courses.status", "published")
    .eq("courses.is_template", false)
    .order("start_at");
  if (error) throw error;
  // completed 已經上完，不顯示
  const sessions = ((data ?? []) as unknown as RawSession[]).filter(
    (s) => s.status !== "completed",
  );
  if (sessions.length === 0) return null;

  const [coaches, counts] = await Promise.all([
    fetchCoaches(supabase, [sessions[0].courses.coach_id]),
    fetchEnrollmentCounts(supabase, sessions.map((s) => s.id)),
  ]);
  const c = sessions[0].courses;
  const card = toCourseCard(sessions[0], coaches.get(c.coach_id), 0);
  return {
    ...card,
    // 場次專屬的欄位交給 sessions，這裡的 id、startsAt、enrolled 只是佔位

    description: c.description ?? "",
    notes: c.notes,
    address: c.location_address,
    coverUrl: resolveCoverUrl({ cover_image_url: c.cover_image_url, sport_type: c.sport_type }),
    coachPhotoUrl: coaches.get(c.coach_id)?.photo_url || null,
    status: "published",
    sessions: sessions.map((s) => ({
      id: s.id,
      startsAt: s.start_at,
      endsAt: s.end_at,
      enrolled: counts.get(s.id) ?? 0,
      status: LISTED_STATUSES.includes(s.status) ? "open" : "cancelled",
      registrationDeadlineAt: s.registration_deadline_at,
      rawStatus: s.status,
    })),
  };
}

// 有沒有登入：報名按鈕要決定是導向登入頁還是繼續報名。
// 用 getUser()（會向 Supabase Auth 驗證）而不是 getSession()（只讀 cookie）。
export async function isLoggedIn(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}

// 報名按鈕要知道「看的人是誰」：訪客，或登入學員加上他已經報名（還沒取消）的場次。
// 一次查完這門課所有場次，不要每個場次各查一次。
export type CourseViewer =
  | { kind: "guest" }
  | { kind: "user"; userId: string; registeredSessionIds: Set<string> };

export async function getCourseViewer(sessionIds: string[]): Promise<CourseViewer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "guest" };

  const { data } = await supabase
    .from("registrations")
    .select("session_id")
    .eq("learner_id", user.id)
    .neq("status", "cancelled")
    .in("session_id", sessionIds);
  return {
    kind: "user",
    userId: user.id,
    registeredSessionIds: new Set((data ?? []).map((r) => r.session_id as string)),
  };
}

// 某個場次教練發過的公告，新的在前。
// 誰讀得到由資料庫 RLS 決定（教練本人，與該場次「待確認開課／確定開課」的報名學員），
// 所以沒資格的人只會拿到空陣列；呼叫端不必（也不能）靠這裡擋人。
export async function getSessionAnnouncements(sessionId: string): Promise<AnnouncementItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("id, content, sent_at")
    .eq("session_id", sessionId)
    .order("sent_at", { ascending: false });
  return (data ?? []).map((a) => ({ id: a.id as string, content: a.content as string, sentAt: a.sent_at as string }));
}
