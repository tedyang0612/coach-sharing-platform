import type { ReactNode } from "react";

// 手機底部固定列：左邊「每人 NT$700」，右邊主按鈕（設計稿 S05 手機）。
// 桌機的價格與按鈕在英雄區，所以這裡只在 lg 以下顯示。
export default function StickyBookingBar({
  price,
  children,
}: {
  price: number;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-(--color-border-default) bg-(--color-surface-default) px-4 pb-6 pt-3 lg:hidden">
      <div className="shrink-0">
        <p className="text-caption text-(--color-text-secondary)">每人</p>
        <p className="font-(family-name:--font-latin) text-[22px] font-medium leading-7">
          NT${price.toLocaleString()}
        </p>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
