import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CoachProfileView,
  type CoachProfileData,
} from "@/components/coach/coach-profile-view";
import { parseEducation } from "@/lib/coach-application/education";
import { createClient } from "@/lib/supabase/server";

// 評價先顯示最近 20 則；MVP 階段評價量不大，之後有需要再做分頁
const REVIEW_LIMIT = 20;

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

// 課程的日期與時間是教練填的台灣當地時間（date／time 欄位，不含時區），直接照字面顯示
function formatCourseWhen(date: string, start: string, end: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${month}/${day}（${weekday}）${start.slice(0, 5)}–${end.slice(0, 5)}`;
}

function todayInTaipei(): string {
  // en-CA 的日期格式剛好是 YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
}

async function loadCoachProfile(coachId: string): Promise<CoachProfileData | null> {
  const supabase = await createClient();

  // coach_profiles 只開放公開欄位的 select（migration 0020），所以要明確列出欄位；
  // 聯絡方式等審核欄位這裡讀不到，也不該出現在公開頁（PRD 4.0 AC 4）。
  // 未通過審核的教練，RLS 會讓其他人查不到這一筆（PRD 第六章 7「公開頁面」）。
  const { data: profile } = await supabase
    .from("coach_profiles")
    .select(
      "id, display_name, photo_url, sport_categories, tags, bio_education, bio_competition, bio_intro, is_verified, application_status, avg_rating, review_count"
    )
    .eq("id", coachId)
    .maybeSingle();
  if (!profile || profile.application_status !== "approved") return null;

  const [licenses, reviews, courses] = await Promise.all([
    supabase.rpc("get_coach_approved_license_names", { p_coach_id: coachId }),
    supabase
      .from("reviews")
      .select("id, rating, comment, reviewer_id, created_at")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(REVIEW_LIMIT),
    supabase
      .from("courses")
      .select("id, title, session_date, time_range_start, time_range_end, location_name, price_per_person")
      .eq("coach_id", coachId)
      .eq("status", "published")
      .eq("is_template", false)
      .gte("session_date", todayInTaipei())
      .order("session_date", { ascending: true }),
  ]);

  // 評價者的暱稱另外查一次，對照回每則評價
  const reviewRows = reviews.data ?? [];
  const reviewerIds = [...new Set(reviewRows.map((review) => review.reviewer_id))];
  const { data: reviewers } = reviewerIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", reviewerIds)
    : { data: [] };
  const reviewerNames = new Map((reviewers ?? []).map((row) => [row.id, row.display_name]));

  const { entries, workExperience } = parseEducation(profile.bio_education ?? "");

  return {
    // 公開顯示的教練名稱（有暱稱用暱稱，沒有用真實姓名），由教練申請時寫入
    name: profile.display_name || "教練",
    photoUrl: profile.photo_url,
    isVerified: Boolean(profile.is_verified),
    sportCategories: profile.sport_categories ?? [],
    tags: profile.tags ?? [],
    education: entries,
    workExperience,
    competition: profile.bio_competition ?? "",
    intro: profile.bio_intro ?? "",
    licenseNames: (licenses.data ?? []) as string[],
    avgRating: profile.avg_rating === null ? null : Number(profile.avg_rating),
    reviewCount: profile.review_count ?? 0,
    reviews: reviewRows.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      reviewerName: reviewerNames.get(review.reviewer_id) ?? "學員",
      createdAt: review.created_at,
    })),
    courses: (courses.data ?? []).map((course) => ({
      id: course.id,
      title: course.title,
      whenLabel: formatCourseWhen(
        course.session_date,
        course.time_range_start,
        course.time_range_end
      ),
      locationName: course.location_name,
      pricePerPerson: Number(course.price_per_person),
    })),
  };
}

export async function generateMetadata({
  params,
}: PageProps<"/coaches/[id]">): Promise<Metadata> {
  const { id } = await params;
  const coach = await loadCoachProfile(id);
  return { title: coach ? `${coach.name}｜夠練 GoLand` : "找不到教練｜夠練 GoLand" };
}

// 教練個人檔案公開頁：未登入也能看（PRD 8.0 規格 2、10.0）
export default async function CoachProfilePage({ params }: PageProps<"/coaches/[id]">) {
  const { id } = await params;
  const coach = await loadCoachProfile(id);
  if (!coach) notFound();

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <CoachProfileView coach={coach} />
      </div>
    </main>
  );
}
