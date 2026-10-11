import { SESSION_DISPLAY_LABELS, type SessionDisplayStatus } from "../_lib/session-rules";

const STYLES: Record<SessionDisplayStatus, string> = {
  recruiting: "bg-brand-ink text-brand",
  matched: "bg-sky-50 text-sky-700",
  ended: "bg-neutral-100 text-neutral-500",
  cancelled: "bg-red-50 text-red-600",
};

/** 場次狀態徽章：招生中／確定開課／已結束／已取消 */
export function SessionStatusBadge({ status }: { status: SessionDisplayStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}>
      {SESSION_DISPLAY_LABELS[status]}
    </span>
  );
}
