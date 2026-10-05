// 報名流程的時間顯示：一律台灣時間（平台只在台灣營運，見 CLAUDE.md「時間與時區慣例」）。

const TAIPEI = "Asia/Taipei";
const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

function taipeiParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TAIPEI,
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { date: `${get("month")}/${get("day")}`, weekday: WEEKDAY[weekdayIndex], time: `${hour}:${get("minute")}` };
}

/** 例：10/17（五）19:00–20:30 */
export function formatSessionRange(startAt: string, endAt: string): { date: string; weekday: string; time: string } {
  const start = taipeiParts(startAt);
  const end = taipeiParts(endAt);
  return { date: start.date, weekday: start.weekday, time: `${start.time}–${end.time}` };
}

/** 例：10/16（四）19:00 */
export function formatDateTime(iso: string): { date: string; weekday: string; time: string } {
  return taipeiParts(iso);
}
