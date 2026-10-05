// 取消與退款規則（Figma S05／S07「Refund rules」）。文案依 PRD 6.0；30% 是否調整待 PRD 負責人定案（設計進度與待辦）。
export function RefundRules({ className = "" }: { className?: string }) {
  const num = "font-[family-name:var(--font-latin)] font-medium";
  return (
    <div
      className={`flex flex-col gap-2 rounded-md border border-border-default bg-brand-light p-4 md:rounded-lg md:p-5 ${className}`}
    >
      <p className="text-label text-text-primary">取消與退款規則</p>
      <p className="text-body-small text-text-secondary">報名時不扣款，報名截止時開課才扣款；未達人數不扣款。</p>
      <p className="text-body-small text-text-secondary">
        開課前 <span className={num}>24</span> 小時以上可線上取消。
      </p>
      <p className="text-body-small text-text-secondary">
        開課前 <span className={num}>24</span> 小時內如需取消，請聯絡教練協助處理，並扣除{" "}
        <span className={num}>30</span>% 平台手續費；缺席不予退款。
      </p>
    </div>
  );
}
