import Link from "next/link";

// 取消與退款規則（Figma S05／S07「Refund rules」）。文案依 PRD v4.8：
// - 24 小時內取消的取消手續費為 50%（PRD v4.7）
// - 報名與結帳頁提供取消與退款規定的連結（連到服務條款「取消與退款」一章，/terms#refund）
// - 契約於報名時成立、報名截止時達最低開課人數才生效（PRD v4.8 3.0 規格 2）
export function RefundRules({ className = "" }: { className?: string }) {
  const num = "font-[family-name:var(--font-latin)] font-medium";
  return (
    <div
      className={`flex flex-col gap-2 rounded-md border border-border-default bg-brand-light p-4 md:rounded-lg md:p-5 ${className}`}
    >
      <p className="text-label text-text-primary">取消與退款規則</p>
      <p className="text-body-small text-text-secondary">報名時不扣款，報名截止時達到開課人數才確定開課並扣款；未達人數不扣款。</p>
      <p className="text-body-small text-text-secondary">
        完成報名並確認付款方式時，課程契約即成立；報名截止時達最低開課人數才生效，未達人數不收取任何費用。
      </p>
      <p className="text-body-small text-text-secondary">
        開課前 <span className={num}>24</span> 小時以上可線上取消。
      </p>
      <p className="text-body-small text-text-secondary">
        開課前 <span className={num}>24</span> 小時內如需取消，請聯絡該堂教練協助處理，將收取 <span className={num}>50</span>%
        取消手續費；缺席不予退款。
      </p>
      <Link
        href="/terms#refund"
        target="_blank"
        rel="noopener noreferrer"
        className="text-body-small w-fit text-brand-deep underline underline-offset-4 hover:no-underline"
      >
        查看完整取消與退款規定
      </Link>
    </div>
  );
}
