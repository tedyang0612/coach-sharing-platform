"use client";

import { useEffect, useRef } from "react";

interface Props {
  id: string;
  label: string;
  // 這個條件目前有值時，膠囊會變色
  active: boolean;
  // 面板寬一點（例如「地區」要放兩欄）
  wide?: boolean;
  // 右下角主按鈕的文字（價格面板依設計稿是「套用」，其他面板是「完成」）
  doneLabel?: string;
  onClear?: () => void;
  children: React.ReactNode;
}

// 篩選列的「膠囊下拉」：按鈕是膠囊，點開是浮動面板。
// 桌面接在膠囊下面；手機貼在畫面底部（膠囊列會換行，不能用橫向捲動，否則面板會被裁掉）。
// 用 <details> 做，不加套件；點外面或按 Esc 收起來，同一時間只會開一個。
export default function FilterPill({
  id,
  label,
  active,
  wide = false,
  doneLabel = "完成",
  onClear,
  children,
}: Props) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsideOrEscape(event: MouseEvent | KeyboardEvent) {
      const el = ref.current;
      if (!el?.open) return;
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") {
          el.open = false;
          el.querySelector("summary")?.focus();
        }
      } else if (!el.contains(event.target as Node)) {
        el.open = false;
      }
    }
    document.addEventListener("mousedown", closeOnOutsideOrEscape);
    document.addEventListener("keydown", closeOnOutsideOrEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideOrEscape);
      document.removeEventListener("keydown", closeOnOutsideOrEscape);
    };
  }, []);

  return (
    <details ref={ref} className="relative shrink-0">
      <summary
        id={id}
        className={`flex cursor-pointer list-none items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition [&::-webkit-details-marker]:hidden ${
          active
            ? "border-(--color-brand-blue) bg-(--color-tint-blue-100) text-(--color-text-primary) font-bold"
            : "border-(--color-border-default) bg-(--color-surface-default) text-(--color-text-primary) hover:border-(--color-brand-blue)"
        }`}
      >
        {label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="shrink-0"
        >
          <path
            d="m2 4 4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div
        className={`z-30 rounded-2xl border border-(--color-border-default) bg-(--color-surface-default) p-3 shadow-lg max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3 max-sm:max-h-[70vh] max-sm:overflow-y-auto sm:absolute sm:left-0 sm:top-full sm:mt-2 ${
          wide ? "sm:w-[26rem]" : "sm:w-64"
        }`}
      >
        {children}
        <div className="mt-2 flex items-center justify-between border-t border-(--color-border-default) pt-2 text-sm">
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-(--color-text-secondary) underline hover:text-(--color-text-primary)"
            >
              清除
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => {
              if (ref.current) ref.current.open = false;
            }}
            className="rounded-full bg-(--color-brand-blue) px-4 py-1 font-bold text-(--color-text-inverse) hover:bg-(--color-brand-blue-pressed)"
          >
            {doneLabel}
          </button>
        </div>
      </div>
    </details>
  );
}
