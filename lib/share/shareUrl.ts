const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 分享出去的連結只保留「路徑」：
// 篩選條件、定位座標（?lat=&lng=）、錨點都不該跟著連結流出去，
// 而且一律綁定本站網域，避免被傳入其他網址。
// 唯一的例外是 ?session=（場次 id，必須是 uuid）：課程詳情一張卡＝一個場次，
// 收到連結的人要看到同一個場次。
export function buildShareUrl(origin: string, pathOrUrl: string): string {
  const target = new URL(pathOrUrl, origin);
  const result = new URL(target.pathname, origin);
  const session = target.searchParams.get("session");
  if (session && UUID_PATTERN.test(session)) {
    result.searchParams.set("session", session);
  }
  return result.toString();
}
