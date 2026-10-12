"use client";

// 課程 QA 編輯（PRD v4.7 1.0 規格 9）：
// - 預設三則空白，問題欄用灰色提示文字顯示範本問題，開始輸入後提示文字消失（placeholder 的行為）
// - 可新增、刪除；問題與回答都有填的才會被儲存（空白的在 server 端略過，見 filledQaItems）
// - 有人報名後仍可編輯（locked 只鎖其他欄位，QA 不受影響）

import type { CourseQaItem } from "@/types/database";
import { FIELD_CLASSES } from "@/components/ui/field-styles";
import {
  MAX_QA_ITEMS,
  QA_ANSWER_MAX,
  QA_QUESTION_MAX,
  QA_TEMPLATE_QUESTIONS,
  serializeQa,
} from "../_lib/course-input";

const QA_NUMBERS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

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
            <div className="flex items-center justify-between gap-2">
              <span className="text-label text-text-primary">第{QA_NUMBERS[i] ?? i + 1}題</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  aria-label={`刪除第${QA_NUMBERS[i] ?? i + 1}題`}
                  className="h-10 w-10 shrink-0 rounded-xl text-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  ✕
                </button>
              )}
            </div>
            <input
              aria-label={`第${QA_NUMBERS[i] ?? i + 1}題 問題`}
              value={item.q}
              disabled={disabled}
              placeholder={QA_TEMPLATE_QUESTIONS[i] ?? `問題（最多 ${QA_QUESTION_MAX} 字）`}
              onChange={(e) => update(i, { q: e.target.value })}
              className={FIELD_CLASSES}
            />
            <textarea
              aria-label={`第${QA_NUMBERS[i] ?? i + 1}題 回答`}
              value={item.a}
              rows={3}
              disabled={disabled}
              placeholder={`回答（最多 ${QA_ANSWER_MAX} 字）`}
              onChange={(e) => update(i, { a: e.target.value })}
              className={`${FIELD_CLASSES} resize-y leading-relaxed`}
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
          選填，最多 {MAX_QA_ITEMS} 則；問題最多 {QA_QUESTION_MAX} 字、回答最多 {QA_ANSWER_MAX} 字。問題與回答都有填寫的才會儲存並顯示在課程頁；QA 為公開內容，請勿填寫聯絡資訊。
        </p>
      )}

      <input type="hidden" name="qa" value={serializeQa(items)} />
    </div>
  );
}
