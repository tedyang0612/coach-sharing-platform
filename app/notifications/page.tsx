import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import { NotificationList } from "@/components/notifications/notification-list";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "通知中心｜夠練 GoLand",
};

// 先顯示最近 50 則；MVP 階段通知量不大，之後有需要再做分頁
const PAGE_SIZE = 50;

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/notifications")}`);
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, link_path, email_sent, is_read, created_at")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  const items = notifications ?? [];
  const unreadCount = items.filter((item) => !item.is_read).length;

  return (
    <main className="flex-1 px-4 pb-8 pt-4 sm:px-6 sm:pb-20 sm:pt-10">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
        <header className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 text-text-primary">通知</h1>
            <p className="text-body-small text-text-secondary">
              {items.length === 0
                ? "目前沒有通知"
                : unreadCount > 0
                  ? `你有 ${unreadCount} 則未讀通知`
                  : "沒有未讀通知"}
            </p>
          </div>
          {unreadCount > 0 && (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="text-label text-brand-deep underline underline-offset-4"
              >
                全部標示為已讀
              </button>
            </form>
          )}
        </header>

        <NotificationList notifications={items} markReadAction={markNotificationRead} />
      </div>
    </main>
  );
}
