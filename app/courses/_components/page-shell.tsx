// 1.0 模組頁面外框：只負責內容區的寬度與標題列。
// 頂部導覽列由全站的 GlobalNav（app/layout.tsx 的 SiteNav）提供，這裡不再自己放 header。

import Link from "next/link";
import { type ReactNode } from "react";

export function PageShell({
  title,
  description,
  back,
  actions,
  children,
}: {
  title: string;
  description?: string;
  back?: { href: string; label: string };
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex-1 bg-surface-page">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:py-8">
        {back && (
          <Link href={back.href} className="text-body-small w-fit font-bold text-text-secondary hover:text-brand-deep">
            ← {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-h1 text-text-primary">{title}</h1>
            {description && <p className="text-body-small mt-1 text-text-secondary">{description}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}

/** 已登入但還不是審核通過的教練 */
export function NotCoachNotice() {
  return (
    <div className="rounded-lg border border-border-default bg-surface-default p-6 text-center shadow-sm">
      <p className="font-bold text-text-primary">需通過教練身分審核才能開課</p>
      <p className="text-body-small mt-1 text-text-secondary">審核通過後即可使用教練工作台上架課程。</p>
    </div>
  );
}
