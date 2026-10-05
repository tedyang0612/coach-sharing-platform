// 教練「預估收益與撥款週期看板」（PRD 11.0、6.0）的計算。純函式、不碰資料庫，頁面與測試共用。
//
// 錢怎麼分（PRD v4.7 6.0、第六章 5.4／5.5）：
// - 確定開課並扣款、課程還沒上完（registrations.status = confirmed）→ 預估收益，扣 5% 媒合費；待確認開課的報名不計入
// - 課程完成（completed）且還沒撥款（payout_id 為空）→ 待撥款；每週三撥付「上週一到週日」完成的課程
// - 課程完成且已有 payout_id → 已撥款
// - 開課前 24 小時內由教練協助退款（partial_refunded）：學員退 50%，另外 50% 手續費中教練分得 25%（取消補償）。
//   這 25% 不扣 5% 媒合費，以場次結束日為準算進該週結算、下個週三撥款，所以和課程完成的款項一樣是「待撥款」→「已撥款」
// - 已取消、已退款（全額）→ 不計入任何一項
// 金額一律用「分」（整數）計算，避免浮點誤差；媒合費四捨五入到分，與資料庫的 round(gross * 0.05, 2) 一致。

export const PLATFORM_FEE_RATE = 0.05;
export const PAYOUT_WEEKDAY = 3; // 週三（週一=1…週日=7）
const TZ = "Asia/Taipei";

export type RegistrationStatus =
  | "pending_match"
  | "confirmed"
  | "cancelled"
  | "refunded"
  | "partial_refunded"
  | "completed";

/** 看板要用的一筆報名（來源：registrations 加上場次與課程） */
export type EarningsInput = {
  registrationId: string;
  courseId: string;
  courseTitle: string;
  sessionStart: string; // timestamptz
  sessionEnd: string; // timestamptz
  amount: number; // 報名當下的每人費用快照
  status: RegistrationStatus;
  payoutId: string | null;
  /** 24 小時內取消時教練分得的取消補償（registrations.coach_compensation_amount）；其他狀態為 null */
  coachCompensation?: number | null;
};

export type PayoutInput = {
  id: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
  grossAmount: number;
  platformFeeAmount: number;
  /** 這期撥款裡的取消補償合計；net = gross − fee + compensation */
  compensationAmount: number;
  netAmount: number;
  payoutDate: string;
};

/** 全部以「分」表示；net = gross − fee + compensation（取消補償不扣媒合費） */
export type Money = { gross: number; fee: number; compensation: number; net: number };

export type EarningsRowStatus = "estimated" | "pending_payout" | "paid_out";

/** course：一般課程款項；cancel_compensation：24 小時內取消，教練分得的 25% */
export type EarningsRowKind = "course" | "cancel_compensation";

export type EarningsRow = {
  registrationId: string;
  courseId: string;
  courseTitle: string;
  sessionStart: string;
  sessionEnd: string;
  kind: EarningsRowKind;
  gross: number; // 課程金額（分）；取消補償那筆是原課程費用，僅供對照，不計入課程款項合計
  fee: number; // 平台抽成（分）；取消補償不扣
  compensation: number; // 取消補償（分）；一般課程為 0
  net: number; // 實收（分）
  status: EarningsRowStatus;
  payoutId: string | null;
};

export type EarningsSummary = {
  /** 已成團扣款、課程尚未完成 */
  estimated: Money;
  /** 課程完成、尚未撥款 */
  pendingPayout: Money;
  /** 已撥款（以 payouts 表為準） */
  paidOut: Money;
  /** 下一次撥款日（最近的週三，今天是週三就是今天），YYYY-MM-DD */
  nextPayoutDate: string;
  /** 下一次撥款結算的區間（上週一到週日） */
  nextPeriod: { start: string; end: string };
  /** 本期預計撥款：待撥款裡，課程在結算區間結束日（含）之前完成的 */
  thisPeriod: Money;
  /** 每筆明細，課程結束時間新到舊 */
  rows: EarningsRow[];
};

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function feeOfCents(grossCents: number): number {
  return Math.round(grossCents * PLATFORM_FEE_RATE);
}

function moneyOfGross(grossCents: number): Money {
  const fee = feeOfCents(grossCents);
  return { gross: grossCents, fee, compensation: 0, net: grossCents - fee };
}

const ZERO: Money = { gross: 0, fee: 0, compensation: 0, net: 0 };

/**
 * 一批報名的合計：只有一般課程款項（kind = course）先加總再算 5%，和資料庫撥款時「整批算一次」的方式一致；
 * 取消補償另外加總、不扣媒合費，實收 = 課程款項 − 5% ＋ 取消補償。
 */
function sumMoney(rows: EarningsRow[]): Money {
  if (rows.length === 0) return ZERO;
  const gross = rows.filter((r) => r.kind === "course").reduce((total, r) => total + r.gross, 0);
  const compensation = rows.reduce((total, r) => total + r.compensation, 0);
  const fee = feeOfCents(gross);
  return { gross, fee, compensation, net: gross - fee + compensation };
}

/** 台灣日期（YYYY-MM-DD）與星期（週一=1…週日=7） */
export function taipeiDate(date: Date): { ymd: string; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdays: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { ymd: `${get("year")}-${get("month")}-${get("day")}`, weekday: weekdays[get("weekday")] };
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const result = new Date(Date.UTC(y, m - 1, d + days));
  return result.toISOString().slice(0, 10);
}

/** 下一次撥款日與結算區間：撥款日是週三，結算「上週一到週日」＝撥款日往前 9 天到 3 天 */
export function nextPayoutSchedule(now: Date): { payoutDate: string; period: { start: string; end: string } } {
  const today = taipeiDate(now);
  const daysAhead = (PAYOUT_WEEKDAY - today.weekday + 7) % 7;
  const payoutDate = addDays(today.ymd, daysAhead);
  return { payoutDate, period: { start: addDays(payoutDate, -9), end: addDays(payoutDate, -3) } };
}

export function buildEarnings(
  inputs: EarningsInput[],
  payouts: PayoutInput[],
  now: Date = new Date()
): EarningsSummary {
  const rows: EarningsRow[] = [];

  for (const input of inputs) {
    const base = {
      registrationId: input.registrationId,
      courseId: input.courseId,
      courseTitle: input.courseTitle,
      sessionStart: input.sessionStart,
      sessionEnd: input.sessionEnd,
      payoutId: input.payoutId,
    };

    // 取消補償：沒有補償金額的部分退款（舊規則留下的、或補償為 0）不計入
    if (input.status === "partial_refunded") {
      const compensation = toCents(input.coachCompensation ?? 0);
      if (compensation <= 0) continue;
      rows.push({
        ...base,
        kind: "cancel_compensation",
        gross: toCents(input.amount),
        fee: 0,
        compensation,
        net: compensation,
        status: input.payoutId ? "paid_out" : "pending_payout",
      });
      continue;
    }

    let status: EarningsRowStatus;
    if (input.status === "confirmed") status = "estimated";
    else if (input.status === "completed") status = input.payoutId ? "paid_out" : "pending_payout";
    else continue; // 待確認開課、已取消、已退款都不計入

    rows.push({ ...base, kind: "course", ...moneyOfGross(toCents(input.amount)), status });
  }

  rows.sort((a, b) => b.sessionEnd.localeCompare(a.sessionEnd));

  const { payoutDate, period } = nextPayoutSchedule(now);
  const pendingRows = rows.filter((r) => r.status === "pending_payout");

  const paidGross = payouts.reduce((total, p) => total + toCents(p.grossAmount), 0);
  const paidFee = payouts.reduce((total, p) => total + toCents(p.platformFeeAmount), 0);
  const paidCompensation = payouts.reduce((total, p) => total + toCents(p.compensationAmount ?? 0), 0);
  const paidNet = payouts.reduce((total, p) => total + toCents(p.netAmount), 0);

  return {
    estimated: sumMoney(rows.filter((r) => r.status === "estimated")),
    pendingPayout: sumMoney(pendingRows),
    paidOut: { gross: paidGross, fee: paidFee, compensation: paidCompensation, net: paidNet },
    nextPayoutDate: payoutDate,
    nextPeriod: period,
    thisPeriod: sumMoney(pendingRows.filter((r) => taipeiDate(new Date(r.sessionEnd)).ymd <= period.end)),
    rows,
  };
}

/** 分 → 「NT$ 1,600」 */
export function formatNtd(cents: number): string {
  const dollars = cents / 100;
  const text = Number.isInteger(dollars)
    ? dollars.toLocaleString("zh-TW")
    : dollars.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `NT$ ${text}`;
}

export const EARNINGS_STATUS_LABELS: Record<EarningsRowStatus, string> = {
  estimated: "預估收益",
  pending_payout: "待撥款",
  paid_out: "已撥款",
};
