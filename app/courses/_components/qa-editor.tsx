"use client";

// 課程 QA 編輯（PRD v4.7 1.0 規格 9）：
// - 預設三則空白，問題欄用灰色提示文字顯示範本問題，開始輸入後提示文字消失（placeholder 的行為）
// - 可新增、刪除；問題與回答都有填的才會被儲存（空白的在 server 端略過，見 filledQaItems）
// - 有人報名後仍可編輯（locked 只鎖其他欄位，QA 不受影響）

import type { CourseQaItem } from "@/types/database";
import {
  MAX_QA_ITEMS,
  QA_ANSWER_MAX,
  QA_QUESTION_MAX,
  QA_TEMPLATE_QUESTIONS,
  serializeQa,
} from "../_lib/course-input";

const CONTROL_CLASS =
  "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-ink disabled:cursor-not-allowed disabled:opacity-60";

type Props = {
  items: CourseQaItem[];
  onChange: (items: CourseQaItem[]) => void;
  disabled?: boolean;
  error?: string;
};

export function QaEditor({ items, onChange, disabled = false, error }: Props) {
  const canAdd = !disabled && items.length < MAX_QA_ITEMS;

  function update(index: number, patch: Partial<CourseQaItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {items.map((item, i) => (
          <li key={i} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3">
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs font-semibold text-neutral-500">QA {i + 1}</span>
              <input
                aria-label={`QA ${i + 1} 問題`}
                value={item.q}
                maxLength={QA_QUESTION_MAX}
                disabled={disabled}
                placeholder={QA_TEMPLATE_QUESTIONS[i] ?? "輸入學員可能會問的問題"}
                onChange={(e) => update(i, { q: e.target.value })}
                className={CONTROL_CLASS}
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  aria-label={`刪除 QA ${i + 1}`}
                  className="h-10 w-10 shrink-0 rounded-xl text-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  ✕
                </button>
              )}
            </div>
            <textarea
              aria-label={`QA ${i + 1} 回答`}
              value={item.a}
              maxLength={QA_ANSWER_MAX}
              rows={2}
              disabled={disabled}
              placeholder="輸入回答"
              onChange={(e) => update(i, { a: e.target.value })}
              className={`${CONTROL_CLASS} resize-y leading-relaxed`}
            />
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange([...items, { q: "", a: "" }])}
          disabled={!canAdd}
          className="h-10 rounded-xl border border-brand px-3 text-xs font-bold text-brand transition hover:bg-brand-ink disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-transparent"
        >
          ＋ 新增一則
        </button>
        {items.length >= MAX_QA_ITEMS && <span className="text-xs text-amber-700">已達上限 {MAX_QA_ITEMS} 則</span>}
      </div>

      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        <p className="text-xs text-neutral-500">
          選填。問題與回答都有填寫的才會儲存並顯示在課程頁；QA 為公開內容，請勿填寫聯絡資訊。
        </p>
      )}

      <input type="hidden" name="qa" value={serializeQa(items)} />
    </div>
  );
}
