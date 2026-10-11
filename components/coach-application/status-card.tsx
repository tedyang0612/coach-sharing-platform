import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { CoachApplicationStatus, LicenseStatus } from "@/types/database";

type Action = { label: string; href: string; variant: "primary" | "secondary" };

// 四種審核狀態的文案與樣式（設計稿 C01；PRD 4.0 規格 3、第六章 5.1）
const STATUS_VIEW: Record<
  CoachApplicationStatus,
  {
    label: string;
    title: string;
    body: string;
    // 上方圓形標記的底色、狀態小圓點的顏色
    markTone: string;
    dotTone: string;
    reasonTitle?: string;
  }
> = {
  pending: {
    label: "審核中",
    title: "我們收到你的申請了",
    body: "管理員正在審核你的資料與文件，結果會以站內通知與 Email 告知。審核期間你仍可正常使用學員功能。",
    markTone: "bg-tint-blue-100 text-text-primary",
    dotTone: "bg-brand-blue",
  },
  approved: {
    label: "審核通過",
    title: "恭喜！你已成為教練",
    body: "教練工作台已開啟，你可以開始建立課程。你的公開教練檔案也已上線。",
    markTone: "bg-tint-blue-100 text-text-primary",
    dotTone: "bg-brand-deep",
  },
  needs_more_info: {
    label: "需補件",
    title: "申請需要補件",
    body: "請依下方原因補充或修改資料，重新送審後狀態會回到「審核中」。",
    markTone: "bg-state-error-bg text-state-error-text",
    dotTone: "bg-state-disabled-text",
    reasonTitle: "補件原因",
  },
  rejected: {
    label: "未通過",
    title: "這次審核未通過",
    body: "很抱歉，這次未通過審核。你可以修改資料後重新送審，次數不受限制。",
    markTone: "bg-state-error-bg text-state-error-text",
    dotTone: "bg-state-disabled-text",
    reasonTitle: "未通過原因",
  },
};

// 時間一律指定台灣時區顯示（CLAUDE.md 時間與時區慣例）；用 formatToParts 自己組字串，
// 伺服器與瀏覽器產生的文字才會完全一樣
function formatTaipeiTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
}

function ClockIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

type StatusCardProps = {
  status: CoachApplicationStatus;
  rejectionReason: string | null;
  // 審核中時顯示的申請摘要
  submittedAt?: string | null;
  sportCategories?: string[];
  uploadedDocuments?: string[];
  // 通過後「查看公開檔案」要連到的教練編號
  coachId?: string;
};

export function StatusCard({
  status,
  rejectionReason,
  submittedAt,
  sportCategories = [],
  uploadedDocuments = [],
  coachId,
}: StatusCardProps) {
  const view = STATUS_VIEW[status];

  const actions: Action[] =
    status === "approved"
      ? [
          // 教練工作台的入口是總覽 /coach，課程管理、收益等用工作台上方的分頁切換
          { label: "前往教練工作台", href: "/coach", variant: "primary" },
          ...(coachId
            ? [{ label: "查看公開檔案", href: `/coaches/${coachId}`, variant: "secondary" } as Action]
            : []),
        ]
      : status === "pending"
        ? [
            { label: "探索課程", href: "/courses", variant: "secondary" },
            { label: "回到首頁", href: "/", variant: "primary" },
          ]
        : [
            { label: "探索課程", href: "/courses", variant: "secondary" },
            {
              label: status === "rejected" ? "修改資料並重新送審" : "修改並重新送審",
              href: "/coach/apply",
              variant: "primary",
            },
          ];

  const summary = [
    { label: "送出時間", value: submittedAt ? formatTaipeiTime(submittedAt) : "" },
    { label: "可授課的運動項目", value: sportCategories.join("、") },
    { label: "已上傳文件", value: uploadedDocuments.join("、") },
  ].filter((row) => row.value !== "");

  return (
    <section className="flex flex-col items-center gap-4 rounded-lg border border-border-default bg-brand-white p-6 text-center sm:p-8">
      <span className={`flex size-[72px] items-center justify-center rounded-pill ${view.markTone}`}>
        {status === "pending" ? <ClockIcon /> : <Icon name="award" className="size-9" />}
      </span>

      <p className="text-label flex items-center gap-2 text-text-secondary">
        <span aria-hidden="true" className={`size-2 rounded-pill ${view.dotTone}`} />
        {view.label}
      </p>

      <h1 className="text-h1 text-text-primary">{view.title}</h1>
      <p className="text-body max-w-xl text-text-secondary">{view.body}</p>

      {status === "pending" && summary.length > 0 && (
        <dl className="flex w-full flex-col gap-2 rounded-md bg-brand-light px-4 py-3.5 text-left">
          {summary.map((row) => (
            <div key={row.label} className="flex justify-between gap-4">
              <dt className="text-body-small shrink-0 text-text-secondary">{row.label}</dt>
              <dd className="text-body-small text-right text-text-primary">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {view.reasonTitle && (
        <>
          <div className="flex w-full flex-col gap-1.5 rounded-md border border-state-error bg-state-error-bg px-4 py-3.5 text-left">
            <p className="text-label text-state-error-text">{view.reasonTitle}</p>
            <p className="text-body whitespace-pre-line text-state-error-text">
              {rejectionReason ?? "管理員未填寫說明，請聯繫平台。"}
            </p>
          </div>
          <p className="text-caption w-full text-left text-text-secondary">
            若良民證原檔已依規定在審核完成 7 天後刪除，重新送審時需重新上傳。
          </p>
        </>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {actions.map((action) => (
          <Link key={action.label} href={action.href} className={buttonClassName(action.variant)}>
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

const LICENSE_VIEW: Record<LicenseStatus, { label: string; dotTone: string }> = {
  pending: { label: "審核中", dotTone: "bg-brand-blue" },
  approved: { label: "已通過", dotTone: "bg-brand-deep" },
  rejected: { label: "未通過", dotTone: "bg-state-error" },
};

export type LicenseStatusItem = {
  id: string;
  name?: string | null;
  status: LicenseStatus;
  rejectionReason: string | null;
};

export function LicenseStatusList({ licenses }: { licenses: LicenseStatusItem[] }) {
  if (licenses.length === 0) return null;
  const verified = licenses.some((license) => license.status === "approved");

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border-default bg-brand-white p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-h3 text-text-primary">專業證照</h2>
        <p className="text-body-small text-text-secondary">
          {verified
            ? "已有證照通過審核，你的個人檔案與課程卡片會顯示「已認證」徽章。"
            : "證照逐張審核，任一張通過後就會顯示「已認證」徽章。"}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {licenses.map((license, index) => {
          const view = LICENSE_VIEW[license.status];
          const rejected = license.status === "rejected";
          return (
            <li
              key={license.id}
              className={`rounded-md border px-4 py-3 ${rejected ? "border-state-error" : "border-border-default"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-body min-w-0 truncate text-text-primary">
                  {license.name || `證照 ${index + 1}`}
                </span>
                <span className="text-label flex shrink-0 items-center gap-2 text-text-secondary">
                  <span aria-hidden="true" className={`size-2 rounded-pill ${view.dotTone}`} />
                  {view.label}
                </span>
              </div>
              {rejected && license.rejectionReason && (
                <p className="text-body-small mt-2 whitespace-pre-line text-state-error-text">
                  原因：{license.rejectionReason}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
