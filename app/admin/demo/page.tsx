import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormError } from "@/components/ui/form-error";
import { DemoJobCard } from "./_components/demo-job-card";
import { DEMO_JOBS, DEMO_JOB_INFO, type DemoOverview } from "./_lib/jobs";

/**
 * Demo 排程控制台（PRD 第六章 6「Demo 建議」）：發表現場不用等時間，按一下就執行開課確認、上課提醒、課程完成、每週撥款。
 * 只有管理員（profiles.is_admin）看得到，其他人一律 404（不透露這個頁面存在）；未登入先導向登入。
 * 真正的把關在資料庫的 admin_demo_overview()／admin_run_demo_job()，這裡的檢查只是不讓一般使用者看到頁面。
 */
export default async function DemoAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent("/admin/demo")}`);

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) notFound();

  const { data, error } = await supabase.rpc("admin_demo_overview");
  const overview = data as DemoOverview | null;

  const counts: Record<(typeof DEMO_JOBS)[number], number> | null = overview && {
    matching: overview.matching_pending,
    reminders: overview.reminders_pending,
    complete: overview.complete_pending,
    payouts: overview.payout_registrations,
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:py-10">
      <div>
        <h1 className="text-h1 text-text-primary">Demo 排程控制台</h1>
        <p className="text-body mt-2 text-text-secondary">
          現場展示用：不用等時間到，按一下就立刻執行系統排程。每個動作都會真的改變資料並發出通知，按之前會先確認。
        </p>
      </div>

      {error || !overview || !counts ? (
        <FormError message="讀取排程狀態失敗，請重新整理頁面。" />
      ) : (
        <ul className="flex flex-col gap-4">
          {DEMO_JOBS.map((job) => (
            <DemoJobCard key={job} job={job} pendingText={DEMO_JOB_INFO[job].pending(overview)} pendingCount={counts[job]} />
          ))}
        </ul>
      )}
    </main>
  );
}
