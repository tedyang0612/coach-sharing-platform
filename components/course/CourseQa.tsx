import { ChevronDownIcon } from "@/components/goland/icons";
import type { CourseQaItem } from "@/lib/courses/types";

// 課程 QA：預設只顯示問題，點問題展開回答，再點一次收合；每一題各自開合。
// 用原生 <details>／<summary>：不需要 JavaScript，鍵盤與螢幕報讀器也都直接支援。
// 教練沒有填寫時整區不顯示。
export default function CourseQa({ items }: { items?: CourseQaItem[] }) {
  if (!items?.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-h3">課程 Q&amp;A</h2>
      <ul className="divide-y divide-(--color-border-default) rounded-(--radius-lg) border border-(--color-border-default) bg-(--color-surface-default)">
        {items.map((item, index) => (
          <li key={index}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-body px-4 py-3 font-bold text-(--color-text-primary) [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span className="shrink-0 text-(--color-text-secondary) transition-transform group-open:rotate-180">
                  <ChevronDownIcon size={18} />
                </span>
              </summary>
              <p className="text-body-small whitespace-pre-line px-4 pb-4 text-(--color-text-secondary)">
                {item.answer}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
