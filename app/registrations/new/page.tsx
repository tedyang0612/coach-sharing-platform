import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatSessionRange } from "../_lib/format";
import { getRegistrationContext, getRegistrationViewer } from "../_lib/queries";
import { getRegistrationState, REGISTRATION_BUTTON_LABELS } from "../_lib/registration-rules";
import { registerHref } from "../_lib/routes";
import { CheckoutView } from "./checkout-view";

// S06 健康聲明彈窗（Figma 42:1692／42:1781）＋ S07 結帳（Figma 42:1871／42:1963）。
// 進頁先跳健康聲明，勾選並按「確認並繼續」後才看得到結帳內容；取消回課程詳情。
export default async function NewRegistrationPage({ searchParams }: PageProps<"/registrations/new">) {
  const params = await searchParams;
  const sessionId = typeof params.session === "string" ? params.session : "";
  if (!sessionId) notFound();

  const supabase = await createClient();
  const viewer = await getRegistrationViewer(supabase, sessionId);
  if (viewer.kind === "guest") {
    redirect(`/login?redirect=${encodeURIComponent(registerHref(sessionId))}`);
  }

  const context = await getRegistrationContext(supabase, sessionId);
  if (!context) notFound();
  const { session, course, enrolledCount } = context;
  const courseHref = `/courses/${course.id}`;

  const state = getRegistrationState({ session, course, enrolledCount, viewer });
  if (state.kind !== "can_register") {
    // 設計稿沒有「無法報名」的畫面（已列待決事項），先用最簡單的提示＋回課程詳情。
    return (
      <main className="flex flex-1 flex-col items-center gap-4 px-[var(--spacing-screen-padding)] py-16 text-center">
        <h1 className="text-h2 text-text-primary">{REGISTRATION_BUTTON_LABELS[state.kind]}</h1>
        <Link href={courseHref} className={buttonClassName("secondary")}>
          回課程詳情
        </Link>
      </main>
    );
  }

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select("display_name")
    .eq("id", course.coach_id)
    .maybeSingle();

  return (
    <CheckoutView
      sessionId={sessionId}
      courseHref={courseHref}
      summary={{
        title: course.title,
        coachName: coach?.display_name ?? "",
        coverUrl: course.cover_image_url ?? null,
        sportType: course.sport_type,
        session: formatSessionRange(session.start_at, session.end_at),
        location: course.location_name,
        price: Number(course.price_per_person),
      }}
    />
  );
}
