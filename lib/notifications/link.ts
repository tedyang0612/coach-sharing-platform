/**
 * 通知的連結是系統產生的站內路徑，這裡仍然只接受站內相對路徑，
 * 避免資料被塞入外部網址（// 或 /\ 開頭會被瀏覽器當成外部網站）。
 * 不是合法站內路徑時回傳 null，畫面上就不顯示「前往查看」。
 */
export function safeLinkPath(value: string | null): string | null {
  if (!value || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}
