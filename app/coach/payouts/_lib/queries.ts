// 收益看板的資料讀取（Server Component 用）。
// 教練只讀得到自己場次的報名與自己的撥款紀錄（registrations、payouts 的 RLS），
// 但一個人同時是學員時，registrations 也會帶出他自己當學員的報名，所以一定要再用 coach_id 過濾。

import { createClient } from "@/lib/supabase/server";
import type { EarningsInput, PayoutInput, RegistrationStatus } from "./earnings";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type RegistrationRow = {
  id: string;
  amount: number;
  status: RegistrationStatus;
  payout_id: string | null;
  coach_compensation_amount: number | null;
  session: {
    start_at: string;
    end_at: string;
    course: { id: string; title: string; coach_id: string };
  };
};

export async function getEarningsData(
  supabase: SupabaseServerClient,
  coachId: string
): Promise<{ inputs: EarningsInput[]; payouts: PayoutInput[] }> {
  const { data: regs } = await supabase
    .from("registrations")
    .select(
      "id, amount, status, payout_id, coach_compensation_amount, session:sessions!inner(start_at, end_at, course:courses!inner(id, title, coach_id))"
    )
    .eq("session.course.coach_id", coachId)
    .in("status", ["confirmed", "completed", "partial_refunded"]);

  const { data: payoutRows } = await supabase
    .from("payouts")
    .select("id, period_start, period_end, gross_amount, platform_fee_amount, compensation_amount, net_amount, payout_date")
    .eq("coach_id", coachId)
    .order("payout_date", { ascending: false });

  const inputs = ((regs ?? []) as unknown as RegistrationRow[]).map((r) => ({
    registrationId: r.id,
    courseId: r.session.course.id,
    courseTitle: r.session.course.title,
    sessionStart: r.session.start_at,
    sessionEnd: r.session.end_at,
    amount: Number(r.amount),
    status: r.status,
    payoutId: r.payout_id,
    coachCompensation: r.coach_compensation_amount === null ? null : Number(r.coach_compensation_amount),
  }));

  const payouts = (payoutRows ?? []).map((p) => ({
    id: p.id as string,
    periodStart: p.period_start as string,
    periodEnd: p.period_end as string,
    grossAmount: Number(p.gross_amount),
    platformFeeAmount: Number(p.platform_fee_amount),
    compensationAmount: Number(p.compensation_amount ?? 0),
    netAmount: Number(p.net_amount),
    payoutDate: p.payout_date as string,
  }));

  return { inputs, payouts };
}
