import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormError } from "@/components/ui/form-error";
import { DemoJobCard } from "./_components/demo-job-card";
import { DEMO_JOBS, DEMO_JOB_INFO, type DemoOverview } from "./_lib/jobs";

// 最近一次執行的時間：一律台灣時區
const lastRunFormat = new Intl.DateTimeFormat("zh-TW", {
  timeZone: "Asia/Taipei",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Demo 排程手動執行（PRD 第六章 6「Demo 建議」；版型對照 Figma A01）：發表現場不用等時間，
 * 按一下就執行開課確認、上課提醒、場次結束、每週撥款。
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

  const [{ data, error }, { data: runs }] = await Promise.all([
    supabase.rpc("admin_demo_overview"),
    supabase.from("scheduled_job_runs").select("job, affected_count, ran_at").order("ran_at", { ascending: false }).limit(50),
  ]);
  const overview = data as DemoOverview | null;

  const counts: Record<(typeof DEMO_JOBS)[number], number> | null = overview && {
    matching: overview.matching_pending,
    reminders: overview.reminders_pending,
    complete: overview.complete_pending,
    payouts: overview.payout_registrations,
  };

  return (
    <main className="flex flex-1 flex-col gap-6 px-[var(--spacing-screen-padding)] pb-24 pt-12">
      <h1 className="text-h1 text-text-primary">Demo 排程手動執行</h1>
      <p className="text-body text-text-secondary">
        僅管理員可見。Demo 時按下按鈕即可立刻跑排程，不用等真實時間；每個動作都會真的改變資料並發出通知，按之前會先確認。良民證原檔使用假文件，不實際刪除。
      </p>
      <p className="text-body-small self-start rounded-md bg-tint-blue-100 px-3.5 py-2.5 text-text-primary">
        你目前以管理員身分操作；一般學員與教練看不到這個頁面。
      </p>

      {error || !overview || !counts ? (
        <FormError message="讀取排程狀態失敗，請重新整理頁面。" />
      ) : (
        <ul className="grid gap-6 md:grid-cols-2">
          {DEMO_JOBS.map((job) => {
            const last = runs?.find((r) => r.job === job);
            const lastRun = last
              ? `${lastRunFormat.format(new Date(last.ran_at))}　${DEMO_JOB_INFO[job].resultLabel(Number(last.affected_count))}`
              : null;
            return (
              <DemoJobCard
                key={job}
                job={job}
                pendingText={DEMO_JOB_INFO[job].pending(overview)}
                pendingCount={counts[job]}
                lastRun={lastRun}
              />
            );
          })}
        </ul>
      )}
    </main>
  );
}
