"use client";

import Image from "next/image";
import { useEffect, type ReactNode } from "react";
import plus from "./icons/plus.svg";

// Figma「Modal」33:682：深藍半透明遮罩＋白底對話框（手機寬 358、內距 24、圓角 lg）。
// 右上角關閉鈕＝淡藍圓底＋旋轉 45° 的加號。按 Esc 或點遮罩等同關閉。
export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-[var(--spacing-screen-padding)]">
      <button
        type="button"
        aria-label="關閉"
        className="absolute inset-0 cursor-default bg-brand-deep/55"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex w-full max-w-[358px] flex-col gap-4 rounded-lg bg-brand-white p-6 shadow-md md:max-w-[480px]"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-h3 flex-1 text-text-primary">{title}</h2>
          <button
            type="button"
            aria-label="關閉"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-brand-light"
          >
            <Image src={plus} alt="" width={22} height={22} className="rotate-45" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
