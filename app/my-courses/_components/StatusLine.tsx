import type { MyRegistrationItem } from "../_lib/my-registrations";

// 狀態列：圓點加文字，文字依設計稿 S09。設計稿沒有畫的狀態（部分退款）沿用 Ted 的 detailLabel。
// 場次被取消不再有「未達人數取消」這種狀態（PRD v4.8 最新版），一律顯示「已取消」加取消原因：
// 未達人數／教練取消（平台取消目前資料庫沒有對應的場次狀態）。
function statusText(item: MyRegistrationItem) {
  const amount = `NT$${item.amount.toLocaleString()}`;
  switch (item.status) {
    case "pending_match":
      return "待確認開課（尚未扣款）";
    case "confirmed":
      return `確定開課・已扣款 ${amount}`;
    case "completed":
      return "課程完成";
    case "cancelled":
      if (item.session.status === "cancelled_unmatched") return "已取消（未達人數）・未扣款";
      if (item.session.status === "cancelled_by_coach") return "已取消（教練取消）・未扣款";
      return "已取消（未扣款）";
    case "refunded":
      return item.session.status === "cancelled_by_coach"
        ? "已取消（教練取消）・已全額退款"
        : `已退款 ${amount}`;
    case "partial_refunded":
      return item.detailLabel;
  }
}

export default function StatusLine({ item }: { item: MyRegistrationItem }) {
  const dot =
    item.category === "pending"
      ? "bg-(--color-brand-blue)"
      : item.category === "cancelled"
        ? "bg-(--color-text-secondary)"
        : "bg-(--color-brand-deep)";
  return (
    <p className="text-body-small flex items-center gap-2 font-bold! text-(--color-text-primary)">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      {statusText(item)}
    </p>
  );
}
