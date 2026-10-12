// 登入頁 ↔ 註冊頁之間，帶入使用者已經輸入的 Email（與密碼），不用重打一次。
//
// - 放 sessionStorage：只存在這個分頁，關掉分頁就沒了；不放網址（網址會留在瀏覽紀錄與伺服器日誌，密碼不能放）。
// - 只在使用者點「免費註冊」「直接登入」的當下才存，不是邊打字邊存。
// - 讀取後立刻刪除（只能用一次）；超過 TTL 當作沒有，避免資料留在分頁裡。
// - 所有存取都包 try/catch：無痕模式或封鎖網站資料時 sessionStorage 可能丟錯，這時就維持原本行為（不帶入）。

const KEY = "goland:auth-prefill";
const TTL_MS = 2 * 60 * 1000;

export type AuthPrefill = { email?: string; password?: string };

export function savePrefill(data: AuthPrefill): void {
  const email = data.email?.trim() ?? "";
  const password = data.password ?? "";
  if (!email && !password) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ email, password, savedAt: Date.now() }));
  } catch {
    // 存不了就算了，頁面照常跳轉，只是不帶入
  }
}

/** 取出並刪除。沒有、過期或格式不對都回傳 null。 */
export function takePrefill(): AuthPrefill | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { email, password, savedAt } = parsed as Record<string, unknown>;
    if (typeof savedAt !== "number" || Date.now() - savedAt > TTL_MS) return null;
    return {
      email: typeof email === "string" && email ? email : undefined,
      password: typeof password === "string" && password ? password : undefined,
    };
  } catch {
    return null;
  }
}
