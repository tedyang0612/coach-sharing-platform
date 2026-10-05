import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
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

  const approvedLicenses = (licenses ?? []).filter((license) => license.status === "approved");
  const isVerified = approvedLicenses.length > 0;

  return (
    <main className="flex-1 px-4 pb-8 pt-5 sm:px-6 lg:px-20 lg:pb-20 lg:pt-10">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-h1 text-text-primary">教練資料管理</h1>
          <p className="text-body-small text-text-secondary">
            修改公開資料、聯絡方式，或追加專業證照。
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
          {/* 右欄（手機排在最上面）：身分審核狀態、已認證的專業證照 */}
          <aside className="flex flex-col gap-4 lg:order-last">
            <section className="flex flex-col gap-4 rounded-lg border border-border-default bg-brand-white p-6">
              <h2 className="text-h3 text-text-primary">身分審核狀態</h2>
              <p className="text-label flex items-center gap-2 text-text-primary">
                <span aria-hidden="true" className="size-2 rounded-pill bg-brand-deep" />
                審核通過
                {isVerified && <Badge type="verified">已認證</Badge>}
              </p>
              <p className="text-body-small text-text-secondary">
                已通過身分審核，可以開課。任一張證照通過後，你的檔案與課程卡片會顯示「已認證」。
              </p>
              <Link href={`/coaches/${user.id}`} className={buttonClassName("secondary", true)}>
                查看公開檔案
              </Link>
            </section>

            <section className="flex flex-col gap-3 rounded-lg border border-border-default bg-brand-white p-6">
              <h2 className="text-h3 text-text-primary">已認證的專業證照</h2>
              <p className="text-body-small text-text-secondary">只顯示名稱，不顯示證照檔案。</p>
              {approvedLicenses.length === 0 ? (
                <p className="text-body-small text-text-secondary">尚無通過審核的證照</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {approvedLicenses.map((license) => (
                    <li key={license.id} className="text-body font-medium text-text-primary">
                      {license.name}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>

          <div className="min-w-0">
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
        </div>
      </div>
    </main>
  );
}
