import { HEALTH_DECLARATION_LINES, HEALTH_DECLARATION_TITLE } from "@/lib/courses/healthDeclaration";

// 課程詳情頁底部的健康聲明（1013 設計稿 S05，在「取消與退款規則」下方）：純文字，不含勾選框；
// 勾選與確認在報名流程的 S06 彈窗，文案與彈窗共用 lib/courses/healthDeclaration.ts。
export default function HealthDeclaration() {
  return (
    <section className="space-y-2 rounded-(--radius-md) border border-(--color-border-default) bg-(--color-brand-light) p-4">
      <h2 className="text-label text-(--color-text-primary)">{HEALTH_DECLARATION_TITLE}</h2>
      {HEALTH_DECLARATION_LINES.map((line) => (
        <p key={line} className="text-body-small text-(--color-text-secondary)">
          {line}
        </p>
      ))}
    </section>
  );
}
