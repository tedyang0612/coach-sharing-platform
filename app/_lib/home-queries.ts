// 首頁（PRD 14.0）資料讀取，Server Component 用。全部是未登入也讀得到的公開資料。
// 不放在 "use server" 檔案裡（理由同 app/courses/_lib/queries.ts）。

import {
  courseListHref,
  HOME_SPORTS,
  POPULAR_CONDITIONS,
  WEEKDAYS,
  WEEKEND,
  type CourseListFilter,
} from "@/app/_lib/home-config";
import { resolveCoverUrl } from "@/app/courses/_lib/cover-image";
import type { ClassCardData } from "@/components/course/class-card";
import type { CoachCardData } from "@/components/coach/coach-card";
import { getSessionProgress } from "@/components/ui/status-indicator";
import { filterCourses, type CourseFilters } from "@/lib/courses/filterCourses";
import { getCourses } from "@/lib/courses/getCourses";
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

// 課程詳情頁（小柔 S05）路由是 /courses/[課程 id]?session=[場次 id]：一張卡＝一個場次，
// 必須帶 session，否則詳情頁會落到該課「最近的場次」，和卡片上顯示的時間對不起來（與 /courses 的 CourseCard 一致）。
const courseHref = (courseId: string, sessionId: string) => `/courses/${courseId}?session=${sessionId}`;
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
        href: courseHref(c.id, row.id),
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

export type PopularCondition = { label: string; href: string };

/** 行政區標籤去掉結尾的「區／鄉／鎮／市」（板橋區→板橋）；兩個字以下的名稱（例：中區）維持原樣 */
function shortDistrictName(district: string): string {
  return district.length > 2 ? district.replace(/[區鄉鎮市]$/, "") : district;
}

// 熱門條件要和課程列表用同一支 filterCourses 計算，才保證點進去不會查無結果。
function toCourseFilters(filter: CourseListFilter): CourseFilters {
  return {
    sport: filter.sport,
    city: filter.city,
    district: filter.district,
    weekdays: filter.days,
    timeSlots: filter.slot ? [filter.slot] : undefined,
  };
}

/**
 * 熱門條件（PRD 14.0 規格 3）：依「目前可報名的場次」即時計算，只列出點進去一定有課的條件。
 * 候選：運動種類、行政區、週末、平日晚間、行政區＋運動；各自用 filterCourses 算場次數。
 * 為了讓五個標籤不要全是同一類，照固定的優先順序挑：
 * 最多場次的運動 → 最多場次的行政區 → 週末 → 最多的「行政區＋運動」→ 第二多的運動 → 平日晚間 → 第二多的行政區 → 第三多的運動。
 * 資料讀取失敗時，退回平台預設的固定清單。
 */
export async function getPopularConditions(limit = 5): Promise<PopularCondition[]> {
  let courses;
  try {
    courses = await getCourses();
  } catch {
    return POPULAR_CONDITIONS.map(({ label, filter }) => ({ label, href: courseListHref(filter) }));
  }
  if (courses.length === 0) return [];

  const count = (filter: CourseListFilter) => filterCourses(courses, toCourseFilters(filter)).length;
  const byCountDesc = <T extends { n: number }>(items: T[]) => [...items].sort((a, b) => b.n - a.n);

  type Candidate = { label: string; filter: CourseListFilter; n: number };

  const sports: Candidate[] = byCountDesc(
    HOME_SPORTS.map(({ name }) => ({ label: name, filter: { sport: name }, n: count({ sport: name }) })),
  ).filter((c) => c.n > 0);

  const districtKeys = [...new Set(courses.map((c) => `${c.city}|${c.district}`))].filter((k) => !k.endsWith("|"));
  const districts: Candidate[] = byCountDesc(
    districtKeys.map((key) => {
      const [city, district] = key.split("|");
      return { label: shortDistrictName(district), filter: { city, district }, n: count({ city, district }) };
    }),
  ).filter((c) => c.n > 0);

  const pairs: Candidate[] = byCountDesc(
    districts.flatMap((d) =>
      sports.map((s) => {
        const filter = { ...d.filter, sport: s.filter.sport };
        return { label: `${d.label}${s.label}`, filter, n: count(filter) };
      }),
    ),
  ).filter((c) => c.n > 0);

  const weekend: Candidate = { label: "週末", filter: { days: WEEKEND }, n: count({ days: WEEKEND }) };
  const weekdayEvening: Candidate = {
    label: "平日晚間",
    filter: { days: WEEKDAYS, slot: "evening" },
    n: count({ days: WEEKDAYS, slot: "evening" }),
  };

  const ordered = [sports[0], districts[0], weekend, pairs[0], sports[1], weekdayEvening, districts[1], sports[2]];
  const seen = new Set<string>();
  const picked: PopularCondition[] = [];
  for (const candidate of ordered) {
    if (!candidate || candidate.n <= 0) continue;
    const href = courseListHref(candidate.filter);
    if (seen.has(href)) continue;
    seen.add(href);
    picked.push({ label: candidate.label, href });
    if (picked.length >= limit) break;
  }
  return picked;
}
