"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// PRD 8.0 AC：Email／密碼格式錯誤或必填空白時無法送出；這裡的驗證是前端 disable
// 按鈕之外的第二道防線（有人繞過前端直接打表單也擋得住）。
export type AuthFormState = {
  errors?: {
    displayName?: string;
    email?: string;
    password?: string;
    form?: string;
  };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 8.0 QA 修正：文案改短，一行講完（此 Email 已註冊，請直接登入）。
const DUPLICATE_EMAIL_MESSAGE = "此 Email 已註冊，請直接登入。";

function safeRedirectTarget(value: FormDataEntryValue | null): string {
  const target = typeof value === "string" ? value : "/";
  // 只接受站內的相對路徑，避免被塞外部網址做開放重導向。
  // "//evil.com" 或 "/\evil.com" 開頭會被瀏覽器當成 protocol-relative URL
  // 導去外部網站，單靠 startsWith("/") 擋不住，這裡額外排除。
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
    return "/";
  }
  return target;
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectTarget(formData.get("redirectTo"));

  const errors: NonNullable<AuthFormState["errors"]> = {};
  if (!EMAIL_RE.test(email)) errors.email = "請輸入正確格式的 Email";
  if (!password) errors.password = "請輸入密碼";
  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Supabase 對「帳號不存在」跟「密碼錯誤」回傳同一種錯誤，
    // 這裡統一顯示成一句話，不特別指出是 Email 還是密碼錯（避免帳號列舉）。
    // 8.0 QA 修正：前台不出現「帳號」字眼，改用「Email」。
    return { errors: { form: "Email 或密碼不正確，請確認後再試一次。" } };
  }

  redirect(redirectTo);
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectTarget(formData.get("redirectTo"));

  const errors: NonNullable<AuthFormState["errors"]> = {};
  // 8.0 QA 決議（2026-10-03）：暱稱統一長度限制 2-20 字，中文字／英數都算一個字元。
  // DB 層（profiles_display_name_length constraint）也有同樣限制，這裡是第一道防線。
  if (!displayName) {
    errors.displayName = "請輸入暱稱";
  } else if (displayName.length < 2 || displayName.length > 20) {
    errors.displayName = "暱稱請輸入 2-20 個字元";
  }
  if (!EMAIL_RE.test(email)) errors.email = "請輸入正確格式的 Email";
  // 8.0 QA 修正：原本只檢查 password.length >= 6，純空白（例如 6 個空格）也會通過。
  // 這裡改用去除前後空白後的長度判斷，擋掉「整串都是空白」的密碼；
  // 密碼中間有空白（例如一般密碼短語）不受影響，不會被動過手。
  if (!password || password.trim().length < 6) {
    errors.password = "密碼至少需要 6 個字元（不能全部是空白）";
  }
  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // handle_new_user() trigger（supabase/migrations/20261001000009_profiles.sql）
    // 會從 raw_user_meta_data.display_name 讀暱稱寫進 profiles，這裡要帶這個 key。
    options: { data: { display_name: displayName } },
  });

  if (error) {
    // Confirm email 關閉時，Supabase 對重複註冊的 Email 會直接回傳錯誤
    // （訊息通常含 "already registered" / "already exists"），不是下面
    // identities 為空陣列的匿名化行為；這裡要攔截訊息內容才能顯示正確文案。
    const message = error.message.toLowerCase();
    if (message.includes("already registered") || message.includes("already exists") || message.includes("user already")) {
      return { errors: { form: DUPLICATE_EMAIL_MESSAGE } };
    }
    return { errors: { form: "註冊失敗，請稍後再試。" } };
  }

  // Confirm email 開啟時，Supabase 對「Email 已被註冊」不會直接回傳錯誤
  // （防止帳號列舉攻擊），而是回傳一個 identities 是空陣列的假 user。
  // 保留這個判斷以涵蓋兩種 Supabase 設定下的情境。
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { errors: { form: DUPLICATE_EMAIL_MESSAGE } };
  }

  redirect(redirectTo);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
