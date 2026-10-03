import Link from "next/link";
import type { CoachApplicationStatus, LicenseStatus } from "@/types/database";

// 四種審核狀態各自的文案與配色（PRD 4.0 規格 3、第六章 5.1）
const STATUS_VIEW: Record<
  CoachApplicationStatus,
  {
    badge: string;
    title: string;
    body: string;
    symbol: string;
    tone: string;
    action?: { label: string; href: string };
  }
> = {
  pending: {
    badge: "審核中",
    title: "教練身分審核中",
    body: "我們已收到你的申請。管理員審核後，會以站內通知與 Email 告知結果。",
    symbol: "…",
    tone: "bg-amber-100 text-amber-700",
  },
  approved: {
    badge: "審核通過",
    title: "恭喜！你已成為夠練教練",
    body: "現在可以前往教練工作台開始開課，你的教練個人檔案也已經公開。",
    symbol: "✓",
    tone: "bg-brand-ink text-brand",
    // 教練工作台的入口是 1.0 的「我的課程」
    action: { label: "前往教練工作台", href: "/coach/courses" },
  },
  needs_more_info: {
    badge: "需補件",
    title: "申請需要補件",
    body: "請依下方的審核說明修改資料，修改後重新送審。",
    symbol: "!",
    tone: "bg-amber-100 text-amber-700",
    action: { label: "修改後重新送審", href: "/coach/apply" },
  },
  rejected: {
    badge: "未通過",
    title: "教練身分審核未通過",
    body: "你可以依下方的審核說明修改資料後重新申請。",
    symbol: "×",
    tone: "bg-red-100 text-red-700",
    action: { label: "修改後重新申請", href: "/coach/apply" },
  },
};

const LICENSE_VIEW: Record<LicenseStatus, { label: string; tone: string }> = {
  pending: { label: "審核中", tone: "bg-amber-100 text-amber-700" },
  approved: { label: "已通過", tone: "bg-brand-ink text-brand" },
  rejected: { label: "未通過", tone: "bg-red-100 text-red-700" },
};

// 時間一律指定台灣時區顯示（CLAUDE.md 時間與時區慣例）
function formatTaipeiTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

type StatusCardProps = {
  status: CoachApplicationStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
};

export function StatusCard({ status, rejectionReason, reviewedAt }: StatusCardProps) {
  const view = STATUS_VIEW[status];
  const showReason = status === "needs_more_info" || status === "rejected";

  return (
    <section className="flex flex-col items-center gap-5 rounded-2xl border border-neutral-200 bg-white p-6 text-center sm:p-8">
      <span
        aria-hidden
        className={`flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold ${view.tone}`}
      >
        {view.symbol}
      </span>

      <div className="flex flex-col items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${view.tone}`}>
          {view.badge}
        </span>
        <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">{view.title}</h1>
        <p className="max-w-md text-sm leading-relaxed text-neutral-500">{view.body}</p>
        {reviewedAt && status !== "pending" && (
          <p className="text-xs text-neutral-400">審核時間：{formatTaipeiTime(reviewedAt)}</p>
        )}
      </div>

      {showReason && (
        <div className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-left">
          <p className="text-xs font-semibold text-neutral-500">審核說明</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-800">
            {rejectionReason ?? "管理員未填寫說明，請聯繫平台。"}
          </p>
        </div>
      )}

      {view.action && (
        <Link
          href={view.action.href}
          className="w-full rounded-xl bg-brand px-8 py-3 text-center text-sm font-bold text-white transition hover:opacity-90 sm:w-auto"
        >
          {view.action.label}
        </Link>
      )}
    </section>
  );
}

export type LicenseStatusItem = {
  id: string;
  // 證照名稱欄位等資料庫補上後才會有值，沒有時顯示「證照 1、2…」
  name?: string | null;
  status: LicenseStatus;
  rejectionReason: string | null;
};

export function LicenseStatusList({ licenses }: { licenses: LicenseStatusItem[] }) {
  if (licenses.length === 0) return null;
  const verified = licenses.some((license) => license.status === "approved");

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-base font-bold text-neutral-900">專業證照</h2>
        <p className="mt-1 text-xs text-neutral-500">
          {verified
            ? "已有證照通過審核，你的個人檔案與課程卡片會顯示「已認證」徽章。"
            : "證照逐張審核，任一張通過後就會顯示「已認證」徽章。"}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {licenses.map((license, index) => {
          const view = LICENSE_VIEW[license.status];
          return (
            <li key={license.id} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-semibold text-neutral-900">
                  {license.name || `證照 ${index + 1}`}
                </span>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${view.tone}`}
                >
                  {view.label}
                </span>
              </div>
              {license.status === "rejected" && license.rejectionReason && (
                <p className="mt-2 whitespace-pre-line text-sm text-neutral-600">
                  {license.rejectionReason}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
