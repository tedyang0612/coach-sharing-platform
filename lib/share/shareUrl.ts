// 分享出去的連結只保留「路徑」：
// 篩選條件、定位座標（?lat=&lng=）、錨點都不該跟著連結流出去，
// 而且一律綁定本站網域，避免被傳入其他網址。
export function buildShareUrl(origin: string, pathOrUrl: string): string {
  const target = new URL(pathOrUrl, origin);
  return new URL(target.pathname, origin).toString();
}
