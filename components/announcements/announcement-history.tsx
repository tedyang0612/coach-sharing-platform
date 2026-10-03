export type AnnouncementItem = {
  id: string;
  content: string;
  sentAt: string;
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

/** 這個場次已經發過的公告，新的在上面。教練的發送頁與學員的「我的課程」場次頁都可以用。 */
export function AnnouncementHistory({ announcements }: { announcements: AnnouncementItem[] }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <h2 className="text-base font-bold text-neutral-900">已發送的公告</h2>
      {announcements.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">這個場次還沒有發過公告</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-4">
          {announcements.map((announcement) => (
            <li
              key={announcement.id}
              className="border-t border-neutral-100 pt-4 first:border-t-0 first:pt-0"
            >
              <time dateTime={announcement.sentAt} className="text-xs text-neutral-400">
                {formatTaipeiTime(announcement.sentAt)}
              </time>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                {announcement.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
