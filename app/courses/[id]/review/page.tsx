import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = {
  title: "填寫課程評價｜夠練 GoLand",
};

// 時間一律指定台灣時區顯示（CLAUDE.md 時間與時區慣例）
function formatTaipeiTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function Notice({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border-default bg-brand-white p-8 text-center">
      <h1 className="text-h3 text-text-primary">{title}</h1>
      <p className="text-body-small text-text-secondary">{body}</p>
      {children}
    </div>
  );
}

/**
 * 課後評價填寫頁（PRD 5.0）。評價邀請通知的連結會帶到這裡
 *（migration 0015 的 complete_finished_sessions：/courses/{course_id}/review）。
 * 評價以「訂單」為單位，所以用登入者＋課程找出這堂課裡已完成、還沒評價的那筆訂單。
 */
export default async function CourseReviewPage({ params }: PageProps<"/courses/[id]/review">) {
  const { id: courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/courses/${courseId}/review`)}`);
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, coach_id")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) notFound();

  const [{ data: coachAccount }, { data: registrations }] = await Promise.all([
    // 公開顯示的教練名稱（有暱稱用暱稱，沒有用真實姓名）
    supabase.from("coach_profiles").select("display_name").eq("id", course.coach_id).maybeSingle(),
    // 這位學員在這堂課底下所有「課程完成」的訂單（不同場次各算一筆）
    supabase
      .from("registrations")
      .select("id, sessions!inner(course_id, start_at)")
      .eq("learner_id", user.id)
      .eq("status", "completed")
      .eq("sessions.course_id", courseId),
  ]);
  const coachName = coachAccount?.display_name ?? "教練";

  const completed = (registrations ?? []).map((registration) => {
    // 巢狀查詢的結果型別依關聯方向可能是物件或陣列，兩種都處理
    const session = [registration.sessions].flat()[0] as { start_at: string } | undefined;
    return { id: registration.id as string, startAt: session?.start_at ?? null };
  });

  const { data: existingReviews } = completed.length
    ? await supabase
        .from("reviews")
        .select("registration_id")
        .in(
          "registration_id",
          completed.map((registration) => registration.id)
        )
    : { data: [] };
  const reviewedIds = new Set((existingReviews ?? []).map((review) => review.registration_id));
  const pending = completed.filter((registration) => !reviewedIds.has(registration.id));
  const target = pending[0];

  return (
    <main className="flex-1 px-4 pb-8 pt-6 sm:px-6 sm:pb-24 sm:pt-14">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
        {target ? (
          // key 讓同一堂課有多筆待評價訂單時，送出一筆後換下一筆會重置表單
          <ReviewForm
            key={target.id}
            registrationId={target.id}
            coachId={course.coach_id}
            coachName={coachName}
            summary={[course.title, coachName, target.startAt ? formatTaipeiTime(target.startAt) : ""]
              .filter(Boolean)
              .join("・")}
          />
        ) : completed.length > 0 ? (
          <Notice title="已評價" body="你已經評價過這堂課了，每筆訂單只能評價一次。">
            <Link
              href={`/coaches/${course.coach_id}`}
              className="text-label text-brand-deep underline underline-offset-4"
            >
              查看教練個人檔案
            </Link>
          </Notice>
        ) : (
          <Notice
            title="目前沒有可以評價的訂單"
            body="課程結束、訂單狀態為「課程完成」之後才能評價。"
          />
        )}
      </div>
    </main>
  );
}
