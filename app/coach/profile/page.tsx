import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "編輯個人檔案｜夠練 GoLand",
};

// 教練工作台底下的「編輯個人檔案」（PRD 9.0 規格 4）
export default async function CoachProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/coach/profile")}`);
  }

  // 只需要公開欄位，直接查 coach_profiles 即可（這些欄位在 select 白名單內）
  const { data: profile } = await supabase
    .from("coach_profiles")
    .select(
      "application_status, photo_url, sport_categories, tags, bio_education, bio_competition, bio_intro"
    )
    .eq("id", user.id)
    .maybeSingle();

  // 還沒申請、審核中、需補件、未通過：個人檔案尚未公開，先看申請狀態
  if (!profile) redirect("/coach/apply");
  if (profile.application_status !== "approved") redirect("/coach/application");

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">編輯個人檔案</h1>
            <p className="mt-1 text-sm text-neutral-500">
              這些內容會公開顯示在你的教練個人檔案，請勿填寫電話、Email、LINE ID 或網址。
            </p>
          </div>
          <Link
            href={`/coaches/${user.id}`}
            className="shrink-0 text-sm font-semibold text-brand hover:underline"
          >
            查看公開頁
          </Link>
        </header>

        <ProfileForm
          userId={user.id}
          initial={{
            photoUrl: profile.photo_url ?? "",
            sportCategories: profile.sport_categories ?? [],
            tags: profile.tags ?? [],
            bioEducation: profile.bio_education ?? "",
            bioCompetition: profile.bio_competition ?? "",
            bioIntro: profile.bio_intro ?? "",
          }}
        />
      </div>
    </main>
  );
}
