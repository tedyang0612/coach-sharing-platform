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

function safeRedirectTarget(value: FormDataEntryValue | null): string {
  const target = typeof value === "string" ? value : "/";
  // 只接受站內的相對路徑，避免被塞外部網址做開放重導向
  return target.startsWith("/") ? target : "/";
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
    // 這裡統一顯示成一句話，不特別指出是帳號還是密碼錯（避免帳號列舉）。
    return { errors: { form: "帳號或密碼錯誤" } };
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
  if (!displayName) errors.displayName = "請輸入暱稱";
  if (!EMAIL_RE.test(email)) errors.email = "請輸入正確格式的 Email";
  if (!password || password.length < 6) errors.password = "密碼至少需要 6 碼";
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
    return { errors: { form: "註冊失敗，請稍後再試" } };
  }

  // Supabase 預設不會對「Email 已被註冊」直接回傳錯誤（防止帳號列舉攻擊），
  // 而是回傳一個 identities 是空陣列的假 user。用這個判斷才能做出 PRD 要求的提示文案。
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { errors: { form: "此 Email 已被註冊，請直接登入" } };
  }

  redirect(redirectTo);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
