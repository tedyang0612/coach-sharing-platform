import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LicenseStatus } from "@/types/database";
import { ApplicationForm, type ExistingApplication } from "./application-form";

export const metadata: Metadata = {
  title: "教練身分申請｜夠練 GoLand",
};

export default async function CoachApplyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 帳號預設是學員，要先登入才能申請；登入後回到這一頁
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/coach/apply")}`);
  }

  // 一個帳號只有一份申請：審核中或已通過就改看申請狀態；
  // 需補件／未通過才會從狀態頁回到這裡修改後重新送審（PRD 4.0 AC 8）
  const { data: summary } = await supabase
    .from("coach_profiles")
    .select("application_status")
    .eq("id", user.id)
    .maybeSingle();
  if (
    summary &&
    (summary.application_status === "pending" || summary.application_status === "approved")
  ) {
    redirect("/coach/application");
  }

  // 第一次申請：暱稱先帶入註冊時填的帳號暱稱（教練可以再改，不會回寫帳號暱稱）
  let defaultNickname: string | undefined;
  if (!summary) {
    const { data: account } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    defaultNickname = account?.display_name ?? undefined;
  }

  // 重新送審：帶入先前填寫的內容。聯絡方式等審核欄位要透過 function 讀自己的完整申請
  let existing: ExistingApplication | undefined;
  if (summary) {
    const { data: application } = await supabase.rpc("get_my_coach_application");
    const { data: licenses } = await supabase
      .from("coach_licenses")
      .select("id, name, status")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: true });

    if (application?.id) {
      existing = {
        status: application.application_status,
        rejectionReason: application.rejection_reason,
        realName: application.real_name ?? "",
        // display_name 等於真實姓名，代表當初沒填暱稱
        nickname:
          application.display_name && application.display_name !== application.real_name
            ? application.display_name
            : "",
        photoUrl: application.photo_url,
        lifestylePhotoUrl: application.lifestyle_photo_url ?? null,
        hasCriminalRecord:
          Boolean(application.criminal_record_url) && !application.criminal_record_deleted,
        sportCategories: application.sport_categories ?? [],
        tags: application.tags ?? [],
        bioEducation: application.bio_education ?? "",
        bioCompetition: application.bio_competition ?? "",
        bioIntro: application.bio_intro ?? "",
        contactPhone: application.contact_phone ?? "",
        contactLine: application.contact_line ?? "",
        contactSocial: application.contact_social ?? "",
        licenses: (licenses ?? []).map((license) => ({
          id: license.id,
          name: license.name,
          status: license.status as LicenseStatus,
        })),
      };
    }
  }

  return (
    <main className="flex-1 px-4 pb-8 pt-5 sm:px-6 sm:pb-20 sm:pt-10">
      <div className="mx-auto flex w-full max-w-[800px] flex-col gap-4">
        <header className="flex flex-col gap-4">
          <h1 className="text-h1 text-text-primary">{existing ? "修改教練申請" : "成為教練"}</h1>
          <p className="text-body text-text-secondary">
            完成一次身分審核就能開課。審核通過後，你的帳號會多一個教練身分，原本的學員功能一樣可以用。
          </p>
        </header>

        <ApplicationForm userId={user.id} existing={existing} defaultNickname={defaultNickname} />
      </div>
    </main>
  );
}
