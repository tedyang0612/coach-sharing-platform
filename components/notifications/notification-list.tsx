"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { buttonClassName } from "@/components/ui/button";
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

// 時間一律指定台灣時區顯示（CLAUDE.md 時間與時區慣例）。用 formatToParts 自己組字串，
// 伺服器與瀏覽器產生的文字才會完全一樣（直接 format() 兩邊的空白字元可能不同，會造成 hydration 錯誤）
function formatTaipeiTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
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
      <div className="flex flex-col items-center gap-4 rounded-lg bg-brand-light px-6 py-12 text-center">
        <p className="text-body text-text-secondary">
          目前沒有通知，報名課程後會在這裡看到開課確認與上課提醒
        </p>
        <Link href="/courses" className={buttonClassName("secondary")}>
          探索課程
        </Link>
      </div>
    );
  }

  const selectedLink = selected ? safeLinkPath(selected.link_path) : null;

  return (
    <>
      <ul className="overflow-hidden rounded-lg border border-border-default bg-brand-white">
        {notifications.map((notification) => {
          const isRead = notification.is_read || readIds.includes(notification.id);
          return (
            <li key={notification.id} className="border-b border-border-default last:border-b-0">
              <button
                type="button"
                onClick={() => open(notification)}
                className={`flex w-full gap-3 p-4 text-left transition hover:bg-tint-blue-100 ${
                  isRead ? "bg-brand-light" : "bg-brand-white"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-2 size-2 shrink-0 rounded-pill ${isRead ? "bg-transparent" : "bg-brand-blue"}`}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className={`text-body text-text-primary ${isRead ? "" : "font-bold"}`}>
                      {!isRead && <span className="sr-only">未讀：</span>}
                      {notification.title}
                    </span>
                    <time
                      dateTime={notification.created_at}
                      className="text-caption shrink-0 text-text-secondary"
                    >
                      {formatTaipeiTime(notification.created_at)}
                    </time>
                  </span>
                  {notification.body && (
                    <span className="text-body-small line-clamp-2 text-text-secondary">
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
        // 點視窗外的背景也能關閉
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        aria-labelledby="notification-dialog-title"
        className="m-auto w-[calc(100%-2rem)] max-w-[358px] rounded-lg p-0 shadow-md backdrop:bg-brand-deep/60"
      >
        {selected && (
          <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-1">
              <h2 id="notification-dialog-title" className="text-h3 text-text-primary">
                {selected.title}
              </h2>
              <p className="text-caption text-text-secondary">
                {formatTaipeiTime(selected.created_at)}
                {/* MVP 是模擬寄信：資料庫只記錄這則通知有沒有同步發 Email */}
                {selected.email_sent && "・已同步寄送 Email"}
              </p>
            </div>

            {selected.body && (
              <p className="text-body max-h-[50vh] overflow-y-auto whitespace-pre-line text-text-secondary">
                {selected.body}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className={buttonClassName("secondary")}
              >
                關閉
              </button>
              {selectedLink && (
                <Link href={selectedLink} className={buttonClassName("primary")}>
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
