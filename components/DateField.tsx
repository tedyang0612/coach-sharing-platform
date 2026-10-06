"use client";

import { useRef, useState } from "react";

// 日期欄位（QA：提示文字要是 YYYY/MM/DD）。瀏覽器內建的 <input type="date"> 提示字無法客製，
// 所以主體是文字輸入：輸入數字時自動補「/」，格式完整且是真的日期才更新；旁邊的日曆按鈕
// 用隱藏的原生日期欄位開選擇器。對外的值一律是 "YYYY-MM-DD"（和網址一致）。
function toDisplay(value: string | undefined) {
  return value ? value.replaceAll("-", "/") : "";
}

function autoSlash(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}/${d.slice(4)}`;
  return `${d.slice(0, 4)}/${d.slice(4, 6)}/${d.slice(6)}`;
}

// 是不是真的存在的日期（例如 2026/02/30 不是）
function isRealDate(display: string) {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(display);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

export default function DateField({
  id,
  value,
  min,
  onCommit,
}: {
  id: string;
  value: string | undefined; // "YYYY-MM-DD"
  min?: string;
  onCommit: (next: string | undefined) => void;
}) {
  const [draft, setDraft] = useState(toDisplay(value));
  const [error, setError] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  function commit() {
    if (draft === "") {
      setError(false);
      if (value !== undefined) onCommit(undefined);
      return;
    }
    if (!isRealDate(draft)) {
      setError(true);
      return;
    }
    setError(false);
    const next = draft.replaceAll("/", "-");
    if (next !== value) onCommit(next);
  }

  return (
    <div className="mt-1 space-y-1">
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="YYYY/MM/DD"
          maxLength={10}
          value={draft}
          aria-invalid={error || undefined}
          onChange={(e) => setDraft(autoSlash(e.target.value))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
          className="w-full rounded-xl border border-(--color-border-default) bg-(--color-surface-default) py-1.5 pl-3 pr-10 font-normal placeholder:text-(--color-text-secondary)"
        />
        <button
          type="button"
          aria-label="開啟日曆"
          onClick={() => picker.current?.showPicker?.()}
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-(--color-text-primary) hover:bg-(--color-tint-blue-100)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" />
            <path d="M16 2V6M8 2V6M3 10H21" />
          </svg>
        </button>
        {/* 只負責開日曆選擇器，不顯示、不收鍵盤焦點 */}
        <input
          ref={picker}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          min={min}
          value={value ?? ""}
          onChange={(e) => {
            setDraft(toDisplay(e.target.value));
            setError(false);
            onCommit(e.target.value || undefined);
          }}
          className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0"
        />
      </div>
      {error && (
        <p className="text-xs text-(--color-state-error-text)">日期格式要是 YYYY/MM/DD</p>
      )}
    </div>
  );
}
