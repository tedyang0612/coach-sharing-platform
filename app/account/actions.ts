"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AccountFormState = {
  /** 儲存成功時為 true；出錯或尚未送出為 undefined */
  saved?: boolean;
  error?: string;
};

// 暱稱規則與註冊一致（8.0 QA 決議）：2–20 個字元；資料庫 profiles_display_name_length 也有同樣限制，
// 這裡是第一道防線，並給使用者看得懂的訊息。
const NAME_MIN = 2;
const NAME_MAX = 20;

/** 「我的帳戶」儲存暱稱：只改 profiles.display_name（RLS 只允許改自己的資料，Email 不可修改）。 */
export async function updateDisplayName(
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) return { error: "請輸入暱稱" };
  if (displayName.length < NAME_MIN || displayName.length > NAME_MAX) {
    return { error: `暱稱請輸入 ${NAME_MIN}-${NAME_MAX} 個字元` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請先登入" };

  const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id);
  if (error) return { error: "儲存失敗，請稍後再試。" };

  // 頂部問候語與其他頁面的暱稱都會跟著更新
  revalidatePath("/account");
  return { saved: true };
}
