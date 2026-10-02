"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { safeLinkPath } from "@/lib/notifications/link";
import type { Notification } from "@/types/database";

export type NotificationItem = Pick<
  Notification,
  "id" | "title" | "body" | "link_path" | "email_sent" | "is_read" | "created_at"
>;

type NotificationListProps = {
  notifications: NotificationItem[];
  // 由頁面傳入 Server Action（app/actions/notifications.ts 的 markNotificationRead）
  markReadAction?: (id: string) => Promise<void>;
};

// 時間一律指定台灣時區顯示（CLAUDE.md 時間與時區慣例）
function formatTaipeiTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/**
 * 通知列表：內容最多顯示兩行，點擊後跳出視窗看完整內容（同時標成已讀），
 * 視窗內可以前往對應頁面。
 */
export function NotificationList({ notifications, markReadAction }: NotificationListProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<NotificationItem | null>(null);
  // 剛點開的通知先在畫面上顯示成已讀，不用等伺服器回應
  const [readIds, setReadIds] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  function open(notification: NotificationItem) {
    setSelected(notification);
    dialogRef.current?.showModal();

    if (!notification.is_read && !readIds.includes(notification.id)) {
      setReadIds((ids) => [...ids, notification.id]);
      if (markReadAction) {
        startTransition(() => markReadAction(notification.id));
      }
    }
  }

  if (notifications.length === 0) {
    return (
      <p className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
        目前沒有通知
      </p>
    );
  }

  const selectedLink = selected ? safeLinkPath(selected.link_path) : null;

  return (
    <>
      <ul className="flex flex-col gap-3">
        {notifications.map((notification) => {
          const isRead = notification.is_read || readIds.includes(notification.id);
          return (
            <li key={notification.id}>
              <button
                type="button"
                onClick={() => open(notification)}
                className={`flex w-full gap-3 rounded-2xl border p-4 text-left transition hover:border-brand sm:p-5 ${
                  isRead ? "border-neutral-200 bg-neutral-50" : "border-brand bg-white shadow-sm"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    isRead ? "bg-transparent" : "bg-brand"
                  }`}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-start justify-between gap-3">
                    <span
                      className={`text-sm text-neutral-900 ${isRead ? "font-medium" : "font-bold"}`}
                    >
                      {!isRead && <span className="sr-only">未讀：</span>}
                      {notification.title}
                    </span>
                    <time
                      dateTime={notification.created_at}
                      className="shrink-0 text-xs text-neutral-400"
                    >
                      {formatTaipeiTime(notification.created_at)}
                    </time>
                  </span>
                  {notification.body && (
                    <span className="line-clamp-2 text-sm leading-relaxed text-neutral-600">
                      {notification.body}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={() => setSelected(null)}
        // 點視窗外的灰色背景也能關閉
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        aria-labelledby="notification-dialog-title"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 backdrop:bg-black/40"
      >
        {selected && (
          <div className="flex flex-col gap-4 p-6">
            <div>
              <h2 id="notification-dialog-title" className="text-base font-bold text-neutral-900">
                {selected.title}
              </h2>
              <p className="mt-1 text-xs text-neutral-400">
                {formatTaipeiTime(selected.created_at)}
                {/* MVP 是模擬寄信：資料庫只記錄這則通知有沒有同步發 Email */}
                {selected.email_sent && "・已同步寄送 Email"}
              </p>
            </div>

            {selected.body && (
              <p className="max-h-[50vh] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                {selected.body}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-brand"
              >
                關閉
              </button>
              {selectedLink && (
                <Link
                  href={selectedLink}
                  className="rounded-xl bg-brand px-5 py-2.5 text-center text-sm font-bold text-white transition hover:opacity-90"
                >
                  前往查看
                </Link>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
