// 報名流程的路由（S06 健康聲明 → S07 結帳 → S08 報名成功）。
// 課程詳情頁（小柔）的「立即報名」請用 registerHref() 導過來，不要自己組網址。

/** S06＋S07：健康聲明彈窗與模擬結帳，同一頁 */
export function registerHref(sessionId: string): string {
  return `/registrations/new?session=${encodeURIComponent(sessionId)}`;
}

/** S08：報名成功（以報名 id 讀取，只有報名者本人看得到） */
export function registrationSuccessHref(registrationId: string): string {
  return `/registrations/${registrationId}`;
}
