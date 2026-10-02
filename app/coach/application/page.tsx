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

  // 只查這一頁要顯示的欄位，不用 select("*")，避免把聯絡方式等不需要的資料一起帶出來
  const { data: application } = await supabase
    .from("coach_profiles")
    .select("application_status, rejection_reason, reviewed_at")
    .eq("id", user.id)
    .maybeSingle();

  // 還沒申請過就先去填表
  if (!application) {
    redirect("/coach/apply");
  }

  // 證照名稱欄位等資料庫補上後，再把 name 加進查詢
  const { data: licenses } = await supabase
    .from("coach_licenses")
    .select("id, status, rejection_reason")
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
            status: license.status as LicenseStatus,
            rejectionReason: license.rejection_reason,
          }))}
        />
      </div>
    </main>
  );
}
