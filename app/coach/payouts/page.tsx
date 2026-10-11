import { redirect } from "next/navigation";
import { getCoachContext } from "@/app/courses/_lib/queries";
import { CoachLocalNav } from "@/components/coach/coach-local-nav";
import { buildEarnings } from "./_lib/earnings";
import { getEarningsData } from "./_lib/queries";
import { PayoutsView } from "./payouts-view";

// C07｜P23 收益與撥款（Figma 46:4347／46:4484）。PRD 11.0、6.0：預估收益／待撥款／已撥款，下一次撥款日與每筆明細。
// 撥款為畫面模擬，不實際匯款。
export default async function PayoutsPage() {
  const ctx = await getCoachContext();
  if (!ctx.ok && ctx.reason === "unauthenticated") {
    redirect(`/login?redirect=${encodeURIComponent("/coach/payouts")}`);
  }

  if (!ctx.ok) {
    return (
      <main className="flex flex-1 flex-col gap-6 px-[var(--spacing-screen-padding)] pb-20 pt-6 md:pt-8">
        <CoachLocalNav active="earnings" />
        <p className="text-body-small rounded-lg border border-border-default bg-brand-white p-6 text-center text-text-secondary">
          需通過教練身分審核才能查看收益與撥款。
        </p>
      </main>
    );
  }

  const { inputs, payouts } = await getEarningsData(ctx.supabase, ctx.userId);
  return <PayoutsView summary={buildEarnings(inputs, payouts)} />;
}
