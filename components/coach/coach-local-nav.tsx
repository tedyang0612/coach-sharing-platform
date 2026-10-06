import Link from "next/link";
import { Icon } from "@/components/ui/icon";

// Figma「Coach Local Navigation」24:1268：只出現在教練區。上方「教練工作台」＋「建立課程」動作鈕，下方四個分頁。
// 建立／編輯課程（P19–P22）時「課程管理」維持 active、建立課程鈕停用（Figma 元件說明）。
// 各分頁的路由：總覽（C02，牛牛）與教練資料管理（C08，牛牛 PR #14 /coach/profile）由各自模組負責。
export type CoachTab = "overview" | "courses" | "profile" | "earnings";

const TABS: { key: CoachTab; label: string; href: string }[] = [
  { key: "overview", label: "總覽", href: "/coach" },
  { key: "courses", label: "課程管理", href: "/coach/courses" },
  { key: "profile", label: "教練資料管理", href: "/coach/profile" },
  { key: "earnings", label: "收益與撥款", href: "/coach/payouts" },
];

export function CoachLocalNav({ active, ctaDisabled = false }: { active: CoachTab; ctaDisabled?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-h1 text-text-primary">教練工作台</h1>
        <span className="flex-1" />
        {ctaDisabled ? (
          <span
            aria-disabled
            className="text-button flex items-center gap-2 rounded-pill bg-state-disabled-bg px-6 py-3 text-state-disabled-text"
          >
            <Icon name="plus" />
            建立課程
          </span>
        ) : (
          <Link
            href="/coach/courses/new"
            className="text-button flex items-center gap-2 rounded-pill bg-brand-blue px-6 py-3 text-text-inverse transition active:bg-brand-blue-pressed"
          >
            <Icon name="plus" />
            建立課程
          </Link>
        )}
      </div>
      <nav
        aria-label="教練工作台"
        className="-mx-[var(--spacing-screen-padding)] flex gap-8 overflow-x-auto border-b border-border-default px-[var(--spacing-screen-padding)] md:mx-0 md:px-0"
      >
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className="flex shrink-0 flex-col gap-2.5 pt-2 text-text-primary"
            >
              <span className={isActive ? "text-button" : "text-body"}>{tab.label}</span>
              <span className={`h-[3px] w-full ${isActive ? "bg-brand-blue" : ""}`} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
