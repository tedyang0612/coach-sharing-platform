import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/** 鈴鐺外觀：未讀數大於 0 時右上角顯示數字，超過 99 顯示 99+。 */
export function NotificationBellIcon({ unreadCount }: { unreadCount: number }) {
  return (
    <Link
      href="/notifications"
      aria-label={unreadCount > 0 ? `通知中心，${unreadCount} 則未讀` : "通知中心"}
      className="relative inline-flex size-10 items-center justify-center rounded-pill text-text-primary transition hover:bg-tint-blue-100"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-pill bg-state-error px-1 text-[11px] font-bold leading-none text-text-inverse">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

/**
 * 導覽列用的通知鈴鐺：自己查登入者的未讀數量，未登入時不顯示。
 * 用法：在導覽列（Server Component）裡放 <NotificationBell /> 即可。
 */
export async function NotificationBell() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false);

  return <NotificationBellIcon unreadCount={count ?? 0} />;
}
