// 未登入按「報名」時導向登入頁，登入後回到原本的頁面（登入頁的 ?redirect= 參數，
// 伺服器端有 safeRedirectTarget 檢查，只接受本站路徑）。
export function loginHref(returnPath: string) {
  return `/login?redirect=${encodeURIComponent(returnPath)}`;
}
