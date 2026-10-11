export type AnnouncementItem = {
  id: string;
  content: string;
  sentAt: string;
};

// 時間一律指定台灣時區顯示（CLAUDE.md 時間與時區慣例）；用 formatToParts 自己組字串，
// 伺服器與瀏覽器產生的文字才會完全一樣
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

type AnnouncementHistoryProps = {
  announcements: AnnouncementItem[];
  // 標題文字；學員端可以換成「教練公告」之類的說法
  title?: string;
  // 沒有公告時顯示的文字
  emptyText?: string;
  // 放進別的卡片裡時設為 false，拿掉自己的外框與留白，避免框中框
  framed?: boolean;
};

/** 這個場次已經發過的公告，新的在上面。教練的發送頁與學員的「我的課程」、課程詳情頁都可以用。 */
export function AnnouncementHistory({
  announcements,
  title = "已發送的公告",
  emptyText = "這個場次還沒有發過公告",
  framed = true,
}: AnnouncementHistoryProps) {
  return (
    <section className={framed ? "rounded-lg border border-border-default bg-brand-white p-6" : undefined}>
      <h2 className="text-h3 text-text-primary">{title}</h2>
      {announcements.length === 0 ? (
        <p className="text-body-small mt-3 text-text-secondary">{emptyText}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-4">
          {announcements.map((announcement) => (
            <li
              key={announcement.id}
              className="border-t border-border-default pt-4 first:border-t-0 first:pt-0"
            >
              <time dateTime={announcement.sentAt} className="text-caption text-text-secondary">
                {formatTaipeiTime(announcement.sentAt)}
              </time>
              <p className="text-body mt-1 whitespace-pre-line text-text-primary">
                {announcement.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
