// 1.0 模組頁面外框。全站 header／導覽列還沒有人做（app/layout.tsx 是共用檔），
// 先在模組內放一個簡單的頂部列，之後全站 header 出來再拿掉。

import Link from "next/link";
import { type ReactNode } from "react";
import { LogoBadge } from "@/components/brand/logo-badge";

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
    <div className="flex-1 bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2.5 px-4">
          <LogoBadge size="sm" />
          <span className="text-base font-bold text-neutral-900">夠練 GoLand</span>
          <span className="ml-1 rounded-full bg-brand-ink px-2 py-0.5 text-xs font-semibold text-brand">教練工作台</span>
          <nav className="ml-auto flex items-center gap-1 text-sm font-semibold">
            <Link href="/coach/courses" className="rounded-lg px-2.5 py-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
              我的課程
            </Link>
            <Link href="/coach/courses/new" className="rounded-lg bg-brand px-2.5 py-1.5 text-white hover:opacity-90">
              ＋ 建立課程
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:py-8">
        {back && (
          <Link href={back.href} className="w-fit text-sm font-semibold text-neutral-500 hover:text-brand">
            ← {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
            {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
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
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
      <p className="font-semibold text-neutral-900">需通過教練身分審核才能開課</p>
      <p className="mt-1 text-sm text-neutral-500">審核通過後即可使用教練工作台上架課程。</p>
    </div>
  );
}
