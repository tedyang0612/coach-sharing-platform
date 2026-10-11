// 畫面顯示用的格式化。時間一律用台灣時區（見 CLAUDE.md「時間與時區慣例」），
// Vercel server 是 UTC，不指定 timeZone 的話 Server Component 會顯示差 8 小時的時間。
// 場次時間只顯示「14:00–15:00」，不加「【1hr】」時長（組長確認：畫面不顯示時長，表單仍要填）。

const TZ = "Asia/Taipei";

const dateFmt = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TZ,
  month: "numeric",
  day: "numeric",
  weekday: "short",
});

const timeFmt = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateTimeFmt = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TZ,
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type DateLike = string | Date;
const toDate = (d: DateLike) => (typeof d === "string" ? new Date(d) : d);

/** 「11/1（週六）」 */
export function formatDate(d: DateLike): string {
  const parts = dateFmt.formatToParts(toDate(d));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")}/${get("day")}（${get("weekday")}）`;
}

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });

/** 「14:00–15:00」；結束時間剛好是隔天 00:00（排到午夜的場次）顯示成 24:00 */
export function formatTimeRange(start: DateLike, end: DateLike): string {
  const endText = timeFmt.format(toDate(end));
  const endsAtMidnight = endText === "00:00" && dayKeyFmt.format(toDate(end)) !== dayKeyFmt.format(toDate(start));
  return `${timeFmt.format(toDate(start))}–${endsAtMidnight ? "24:00" : endText}`;
}

/** 「11/1（週六）14:00–15:00」 */
export function formatSessionTime(start: DateLike, end: DateLike): string {
  return `${formatDate(start)} ${formatTimeRange(start, end)}`;
}

/** 「10/31 14:00」 */
export function formatDateTime(d: DateLike): string {
  return dateTimeFmt.format(toDate(d));
}

export function formatPrice(amount: number): string {
  return `NT$ ${amount.toLocaleString("zh-TW")}`;
}
