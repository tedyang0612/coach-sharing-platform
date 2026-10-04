import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LicenseStatus } from "@/types/database";
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

  // 聯絡方式不在 coach_profiles 的 select 白名單內，要透過 function 讀自己的完整資料；
  // 還沒申請過時回傳 null 或每個欄位都是 null 的一筆資料，所以用 id 判斷
  const { data: profile } = await supabase.rpc("get_my_coach_application");

  // 還沒申請、審核中、需補件、未通過：個人檔案尚未公開，先看申請狀態
  if (!profile?.id) redirect("/coach/apply");
  if (profile.application_status !== "approved") redirect("/coach/application");

  const { data: licenses } = await supabase
    .from("coach_licenses")
    .select("id, name, status, rejection_reason")
    .eq("coach_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">編輯個人檔案</h1>
            <p className="mt-1 text-sm text-neutral-500">
              修改公開資料、聯絡方式，或追加專業證照。
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
            realName: profile.real_name ?? "",
            // display_name 等於真實姓名，代表沒有另外設定暱稱
            nickname:
              profile.display_name && profile.display_name !== profile.real_name
                ? profile.display_name
                : "",
            photoUrl: profile.photo_url ?? "",
            lifestylePhotoUrl: profile.lifestyle_photo_url ?? "",
            sportCategories: profile.sport_categories ?? [],
            tags: profile.tags ?? [],
            bioEducation: profile.bio_education ?? "",
            bioCompetition: profile.bio_competition ?? "",
            bioIntro: profile.bio_intro ?? "",
            contactPhone: profile.contact_phone ?? "",
            contactLine: profile.contact_line ?? "",
            contactSocial: profile.contact_social ?? "",
          }}
          licenses={(licenses ?? []).map((license) => ({
            id: license.id,
            name: license.name,
            status: license.status as LicenseStatus,
            rejectionReason: license.rejection_reason,
          }))}
        />
      </div>
    </main>
  );
}
