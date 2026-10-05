import { toV46Wording } from "../_lib/display";
import type { MyRegistrationItem } from "../_lib/my-registrations";

// 狀態列：圓點加文字，文字依設計稿 S09。設計稿沒有畫的狀態（部分退款、教練取消場次）
// 沿用 Ted 的 detailLabel（轉成 v4.6 用詞），等設計師補畫再對。
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
      return item.session.status === "cancelled_by_coach" ||
        item.session.status === "cancelled_unmatched"
        ? toV46Wording(item.detailLabel)
        : "已取消（未扣款）";
    case "refunded":
      return item.session.status === "cancelled_by_coach"
        ? toV46Wording(item.detailLabel)
        : `已退款 ${amount}`;
    case "partial_refunded":
      return toV46Wording(item.detailLabel);
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
    <p className="text-body-small flex items-center gap-2 font-bold text-(--color-text-primary)">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      {statusText(item)}
    </p>
  );
}
