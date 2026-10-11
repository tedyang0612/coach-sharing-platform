import { REFUND_RULE_LINES, REFUND_RULE_TITLE } from "@/lib/courses/refundRules";

// 取消與退款規則：淡藍底框，文案集中在 lib/courses/refundRules.ts
export default function RefundRule() {
  return (
    <section className="space-y-2 rounded-(--radius-md) border border-(--color-border-default) bg-(--color-brand-light) p-4">
      <h2 className="text-label text-(--color-text-primary)">{REFUND_RULE_TITLE}</h2>
      {REFUND_RULE_LINES.map((line) => (
        <p key={line} className="text-body-small text-(--color-text-secondary)">
          {line}
        </p>
      ))}
    </section>
  );
}
