import Image from "next/image";
import { CoachLocalNav } from "@/components/coach/coach-local-nav";
import full from "@/components/ui/icons/status/full.svg";
import nearlyFull from "@/components/ui/icons/status/nearly-full.svg";
import reached from "@/components/ui/icons/status/reached.svg";
import recruiting from "@/components/ui/icons/status/recruiting.svg";
import { PLATFORM_FEE_RATE, type EarningsRow, type EarningsRowStatus, type EarningsSummary } from "./_lib/earnings";

// C07｜P23 收益與撥款的畫面（純顯示，資料由 page.tsx 用 buildEarnings() 算好傳入）。

const latin = "font-[family-name:var(--font-latin)] font-medium";
const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

/** 分 → 「NT$6,650」（Figma 寫法，NT$ 後不空格） */
function ntd(cents: number): string {
  const dollars = cents / 100;
  return `NT$${dollars.toLocaleString("zh-TW", { maximumFractionDigits: 2 })}`;
}

/** 「2026-10-22」→「10/22（三）」 */
function ymdLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const weekday = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d}（${weekday}）`;
}

/** 場次開始時間 →「10/10（五）19:00」，一律台灣時間 */
function sessionLabel(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = WEEKDAY[["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"))];
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("month")}/${get("day")}（${weekday}）${hour}:${get("minute")}`;
}

// Figma「Earnings Row」45:904 的狀態圓點與文案
const STATUS: Record<EarningsRowStatus, { dot: typeof full; size: number; label: string }> = {
  estimated: { dot: recruiting, size: 8, label: "預估（確定開課，待上課）" },
  pending_payout: { dot: nearlyFull, size: 12, label: "待撥款" },
  paid_out: { dot: reached, size: 8, label: "已撥款" },
};

export function PayoutsView({ summary }: { summary: EarningsSummary }) {
  const feePercent = PLATFORM_FEE_RATE * 100;
  return (
    <main className="flex flex-1 flex-col gap-6 px-[var(--spacing-screen-padding)] pb-20 pt-6 md:pt-8">
      <CoachLocalNav active="earnings" />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="預估收益"
          value={ntd(summary.estimated.net)}
          note={
            <>
              已確定開課、尚未上課，已扣 <span className={latin}>{feePercent}</span>% 媒合費（待確認開課不計入）
            </>
          }
        />
        <StatCard label="待撥款" value={ntd(summary.pendingPayout.net)} note="課程完成後轉為待撥款" />
        <StatCard label="已撥款（累計）" value={ntd(summary.paidOut.net)} note="每週三撥付上週一至週日完成的課程" />
      </div>

      <div className="flex flex-col gap-1 rounded-lg border border-brand-blue bg-tint-blue-100 px-5 py-4 md:flex-row md:items-center md:gap-4">
        <p className="text-h3 text-text-primary">
          下一次撥款日：<span className={latin}>{ymdLabel(summary.nextPayoutDate)}</span>
        </p>
        <p className="text-body-small text-text-secondary">
          本期預計撥款 <span className={latin}>{ntd(summary.thisPeriod.net)}</span>・撥款為畫面模擬，不實際匯款
        </p>
      </div>

      <h2 className="text-h2 text-text-primary">撥款明細</h2>

      {summary.rows.length === 0 ? (
        <p className="text-body-small rounded-lg border border-dashed border-border-default bg-brand-white p-8 text-center text-text-secondary">
          目前還沒有確定開課或已完成的課程。
        </p>
      ) : (
        <>
          {/* 桌機：表格 */}
          <div className="hidden overflow-clip rounded-lg border border-border-default md:block">
            <div className="text-label flex gap-4 bg-tint-blue-100 px-5 py-3 text-text-primary">
              <span className="flex-1">課程</span>
              <span className="w-40">場次</span>
              <span className="w-[130px] text-right">課程金額</span>
              <span className="w-[130px] text-right">
                平台抽成 <span className={latin}>{feePercent}</span>%
              </span>
              <span className="w-[130px] text-right">實收金額</span>
              <span className="w-[200px]">撥款狀態</span>
            </div>
            {summary.rows.map((row) => (
              <div
                key={row.registrationId}
                className="flex h-16 items-center gap-4 border-b border-border-default bg-brand-white px-5 last:border-b-0"
              >
                <span className="text-button flex-1 truncate text-text-primary">{row.courseTitle}</span>
                <span className="text-body-small w-40 text-text-secondary">{sessionLabel(row.sessionStart)}</span>
                <span className={`text-body w-[130px] text-right text-text-primary ${latin}`}>{ntd(row.gross)}</span>
                <span className={`text-body w-[130px] text-right text-text-secondary ${latin}`}>{row.fee > 0 ? `-${ntd(row.fee)}` : "—"}</span>
                <span className={`text-body w-[130px] text-right text-text-primary ${latin}`}>{ntd(row.net)}</span>
                <span className="w-[200px]">
                  <RowStatus status={row.status} kind={row.kind} />
                </span>
              </div>
            ))}
          </div>

          {/* 手機：卡片列 */}
          <ul className="-mx-[var(--spacing-screen-padding)] flex flex-col gap-4 md:hidden">
            {summary.rows.map((row) => (
              <MobileRow key={row.registrationId} row={row} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}


function StatCard({ label, value, note }: { label: string; value: string; note: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border-default bg-brand-white p-5">
      <p className="text-label text-text-secondary">{label}</p>
      {/* Figma 32px／40px Poppins（tokens 的 Number Large 是 24px，已列待確認） */}
      <p className={`text-[32px] leading-10 text-text-primary ${latin}`}>{value}</p>
      <p className="text-caption text-text-secondary">{note}</p>
    </div>
  );
}

function RowStatus({ status, kind }: { status: EarningsRowStatus; kind: EarningsRow["kind"] }) {
  const s = STATUS[status];
  // 取消補償（24 小時內教練協助退款，教練分得 25%）：狀態文字前綴「取消補償・」
  const label = kind === "cancel_compensation" ? `取消補償・${s.label.replace("預估（確定開課，待上課）", "預估")}` : s.label;
  return (
    <span className="text-label inline-flex items-center gap-1.5 text-text-primary">
      <Image src={s.dot} alt="" width={s.size} height={s.size} />
      {label}
    </span>
  );
}

function MobileRow({ row }: { row: EarningsRow }) {
  return (
    <li className="flex flex-col gap-2 border-b border-border-default bg-brand-white px-[var(--spacing-screen-padding)] py-4">
      <div className="flex items-start gap-3">
        <span className="text-button flex-1 text-text-primary">{row.courseTitle}</span>
        <span className={`text-h3 text-text-primary ${latin}`}>{ntd(row.net)}</span>
      </div>
      <p className="text-caption text-text-secondary">
        {sessionLabel(row.sessionStart)}・課程金額 <span className={latin}>{ntd(row.gross)}</span>・抽成{" "}
        {row.fee > 0 ? <span className={latin}>-{ntd(row.fee)}</span> : "—"}
      </p>
      <RowStatus status={row.status} kind={row.kind} />
    </li>
  );
}
