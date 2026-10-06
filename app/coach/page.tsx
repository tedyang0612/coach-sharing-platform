import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildEarnings, formatNtd } from "@/app/coach/payouts/_lib/earnings";
import { getEarningsData } from "@/app/coach/payouts/_lib/queries";
import { NotCoachNotice } from "@/app/courses/_components/page-shell";
import { getCoachContext, listMyCourses } from "@/app/courses/_lib/queries";
import { CoachOverviewView, type OverviewStat } from "./_components/overview-view";
import { countThisWeek, formatPayoutDate, listUpcomingSessions } from "./_lib/overview";

export const metadata: Metadata = {
  title: "教練工作台｜夠練 GoLand",
};

/**
 * 教練總覽（設計稿 C02｜P17）：四張數字卡＋近期場次。
 * 收益數字來自 11.0 的 buildEarnings()，場次來自 1.0 的 listMyCourses()，這一頁只負責顯示。
 * 工作台上方的標題、建立課程鈕與四個分頁用 Ted 的共用外框 CoachLocalNav（PR #63）。
 */
export default async function CoachOverviewPage() {
  const ctx = await getCoachContext();
  if (!ctx.ok && ctx.reason === "unauthenticated") {
    redirect(`/login?redirect=${encodeURIComponent("/coach")}`);
  }
  if (!ctx.ok) {
    return (
      <main className="flex-1 px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-xl">
          <NotCoachNotice />
        </div>
      </main>
    );
  }

  const now = new Date();
  const [courses, earningsData] = await Promise.all([
    listMyCourses(ctx),
    getEarningsData(ctx.supabase, ctx.userId),
  ]);
  const earnings = buildEarnings(earningsData.inputs, earningsData.payouts, now);
  const upcoming = listUpcomingSessions(courses, now);
  const week = countThisWeek(upcoming, now);

  const stats: OverviewStat[] = [
    {
      label: "預估收益",
      value: formatNtd(earnings.estimated.net),
      note: "已確定開課、尚未上課的訂單，已扣 5% 媒合費",
    },
    {
      label: "待撥款",
      value: formatNtd(earnings.pendingPayout.net),
      note: "課程已完成，等待下一次撥款",
    },
    {
      label: "下一次撥款日",
      value: formatPayoutDate(earnings.nextPayoutDate),
      note: `本期預計撥款 ${formatNtd(earnings.thisPeriod.net)}`,
    },
    {
      label: "本週場次",
      value: `${week.total} 場`,
      note: week.total === 0 ? "本週沒有場次" : `${week.recruiting} 場招生中、${week.matched} 場確定開課`,
    },
  ];

  return <CoachOverviewView stats={stats} upcoming={upcoming} />;
}
