import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  LicenseStatusList,
  StatusCard,
} from "@/components/coach-application/status-card";
import { createClient } from "@/lib/supabase/server";
import type { CoachApplicationStatus, LicenseStatus } from "@/types/database";

export const metadata: Metadata = {
  title: "教練申請狀態｜夠練 GoLand",
};

// 審核結果通知的連結會帶到這一頁（見 migration 0017 的 notify_coach_application_reviewed）
export default async function CoachApplicationStatusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/coach/application")}`);
  }

  // coach_profiles 只開放公開欄位的 select（migration 0020），退件原因、審核時間這些
  // 審核欄位要透過 get_my_coach_application() 讀自己的完整申請。
  // 還沒申請過時，這支 function 會回傳 null 或每個欄位都是 null 的一筆資料，所以用 id 判斷。
  const { data: application } = await supabase.rpc("get_my_coach_application");
  if (!application?.id) {
    redirect("/coach/apply");
  }

  const { data: licenses } = await supabase
    .from("coach_licenses")
    .select("id, name, status, rejection_reason")
    .eq("coach_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <StatusCard
          status={application.application_status as CoachApplicationStatus}
          rejectionReason={application.rejection_reason}
          reviewedAt={application.reviewed_at}
        />
        <LicenseStatusList
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
