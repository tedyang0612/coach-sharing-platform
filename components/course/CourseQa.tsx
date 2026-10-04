import type { CourseQaItem } from "@/lib/courses/types";

// 課程 QA：預設只顯示問題，點問題展開回答，再點一次收合；每一題各自開合。
// 用原生 <details>／<summary>：不需要 JavaScript，鍵盤與螢幕報讀器也都直接支援。
// 教練沒有填寫時整區不顯示。
export default function CourseQa({ items }: { items?: CourseQaItem[] }) {
  if (!items?.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-bold">課程 Q&amp;A</h2>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
        {items.map((item, index) => (
          <li key={index}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-slate-800 [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                >
                  ⌄
                </span>
              </summary>
              <p className="whitespace-pre-line px-4 pb-4 text-sm text-slate-600">
                {item.answer}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
