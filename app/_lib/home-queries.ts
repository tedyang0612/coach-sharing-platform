// 首頁（PRD 14.0）資料讀取，Server Component 用。全部是未登入也讀得到的公開資料。
// 不放在 "use server" 檔案裡（理由同 app/courses/_lib/queries.ts）。

import { HOME_SPORTS } from "@/app/_lib/home-config";
import { resolveCoverUrl } from "@/app/courses/_lib/cover-image";
import type { ClassCardData } from "@/components/course/class-card";
import type { CoachCardData } from "@/components/coach/coach-card";
import { getSessionProgress } from "@/components/ui/status-indicator";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const LEVEL_LABELS: Record<string, string> = {
  unlimited: "不限",
  beginner: "初階",
  intermediate: "中階",
  advanced: "進階",
};

const TAIPEI = "Asia/Taipei";
const dateFormat = new Intl.DateTimeFormat("zh-TW", { timeZone: TAIPEI, month: "numeric", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TAIPEI,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** 例：10/17 19:00–20:30（一律台灣時間，不依執行環境時區） */
export function formatSessionTime(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const date = dateFormat.format(start).replace(/\s/g, "");
  return `${date} ${timeFormat.format(start)}–${timeFormat.format(new Date(endAt))}`;
}

// 課程詳情頁（小柔 S05）路由是 /courses/[課程 id]，場次在詳情頁內選。
const courseHref = (courseId: string) => `/courses/${courseId}`;
const coachHref = (coachId: string) => `/coaches/${coachId}`;

/** 該教練是否有「已通過」的證照＝「已認證」徽章（PRD 4.0／9.0） */
async function isVerifiedCoach(supabase: SupabaseServerClient, coachId: string): Promise<boolean> {
  const { data } = await supabase.rpc("get_coach_approved_license_names", { p_coach_id: coachId });
  return Array.isArray(data) && data.length > 0;
}

type SessionRow = {
  id: string;
  start_at: string;
  end_at: string;
  courses: {
    id: string;
    title: string;
    sport_type: string;
    level: string;
    location_name: string;
    cover_image_url: string | null;
    price_per_person: number;
    min_participants: number;
    max_participants: number;
    coach_id: string;
    districts: { city: string } | null;
    coach_profiles: { display_name: string; avg_rating: number | null } | null;
  } | null;
};

/**
 * 推薦課程：取課程列表「推薦排序」的前 4 筆（PRD 2.0 規格 15）：
 * 1. 未達最低開課人數：差距少者在前，同差距開課時間近者在前
 * 2. 已達最低開課人數、仍可報名：開課時間近者在前
 * 3. 已額滿：開課時間近者在前，排最後
 * 以上都相同時以場次 id 排，確保結果固定。
 */
export async function getRecommendedClasses(limit = 4): Promise<ClassCardData[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select(
      "id, start_at, end_at, courses!inner(id, title, sport_type, level, location_name, cover_image_url, price_per_person, min_participants, max_participants, coach_id, status, is_template, districts(city), coach_profiles(display_name, avg_rating))",
    )
    .eq("status", "open")
    .gt("registration_deadline_at", new Date().toISOString())
    .eq("courses.status", "published")
    .eq("courses.is_template", false)
    .order("start_at")
    .limit(200)
    .overrideTypes<SessionRow[], { merge: false }>();

  const rows = (data ?? []).filter((r): r is SessionRow & { courses: NonNullable<SessionRow["courses"]> } => !!r.courses);
  if (rows.length === 0) return [];

  const { data: counts } = await supabase.rpc("get_session_enrollment_counts", {
    p_session_ids: rows.map((r) => r.id),
  });
  const enrolledBySession = new Map<string, number>(
    ((counts ?? []) as { session_id: string; enrolled_count: number }[]).map((c) => [c.session_id, c.enrolled_count]),
  );

  const ranked = rows
    .map((r) => {
      const enrolled = enrolledBySession.get(r.id) ?? 0;
      const { min_participants: min, max_participants: max } = r.courses;
      const group = enrolled >= max ? 2 : enrolled >= min ? 1 : 0;
      return { row: r, enrolled, group, gap: group === 0 ? min - enrolled : 0 };
    })
    .sort(
      (a, b) =>
        a.group - b.group ||
        a.gap - b.gap ||
        new Date(a.row.start_at).getTime() - new Date(b.row.start_at).getTime() ||
        a.row.id.localeCompare(b.row.id),
    )
    .slice(0, limit);

  return Promise.all(
    ranked.map(async ({ row, enrolled }) => {
      const c = row.courses;
      return {
        href: courseHref(c.id),
        coverUrl: resolveCoverUrl({ cover_image_url: c.cover_image_url, sport_type: c.sport_type }),
        sport: c.sport_type,
        levelLabel: LEVEL_LABELS[c.level] ?? c.level,
        verified: await isVerifiedCoach(supabase, c.coach_id),
        title: c.title,
        timeText: formatSessionTime(row.start_at, row.end_at),
        locationText: c.districts ? `${c.districts.city}・${c.location_name}` : c.location_name,
        coachName: c.coach_profiles?.display_name ?? "",
        rating: c.coach_profiles?.avg_rating ?? null,
        pricePerPerson: Number(c.price_per_person),
        progress: getSessionProgress({
          enrolled,
          minParticipants: c.min_participants,
          maxParticipants: c.max_participants,
        }),
      } satisfies ClassCardData;
    }),
  );
}

type RecommendedCoachRow = {
  id: string;
  display_name: string;
  photo_url: string;
  lifestyle_photo_url: string | null;
  sport_categories: string[];
  tags: string[];
  avg_rating: number | null;
  review_count: number;
  open_course_count: number;
  month_completed_sessions: number;
};

/** 教練「生活／運動照片」還沒上傳時的預設：用該教練第一個運動項目的運動照片；都沒有就回傳 null（卡片只顯示淡藍底） */
function defaultCoachPhoto(sports: string[]): string | null {
  for (const name of sports) {
    const found = HOME_SPORTS.find((s) => s.name === name);
    if (found) return found.image;
  }
  return null;
}

/**
 * 推薦教練（PRD 14.0）：呼叫資料庫函式 get_recommended_coaches(p_limit)，
 * 不直接 select coach_profiles（未登入會被權限擋下，區塊會是空的）。
 * 函式只回傳「已認證」的教練，依當月完成場次數由多到少排序；卡片用「生活／運動照片」（lifestyle_photo_url），
 * 大頭貼（photo_url）只用在頭像，不放在卡片上。
 */
export async function getRecommendedCoaches(limit = 5): Promise<CoachCardData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_recommended_coaches", { p_limit: limit });
  if (error || !data) return [];

  return (data as RecommendedCoachRow[]).map((c) => ({
    href: coachHref(c.id),
    photoUrl: c.lifestyle_photo_url ?? defaultCoachPhoto(c.sport_categories),
    name: c.display_name,
    rating: c.avg_rating,
    sports: c.sport_categories,
    tags: c.tags,
    openCourseCount: c.open_course_count,
  }));
}
