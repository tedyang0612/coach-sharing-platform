import { createClient } from "@/lib/supabase/server";
import { GlobalNav, type NavAuth } from "./global-nav";

// 伺服器端判斷身分後交給 GlobalNav：
// 未登入＝guest；登入且教練申請已通過（coach_profiles.application_status = approved）＝coach；其餘登入者＝user。
// 身分是動態判斷的，profiles 沒有 role 欄位（見 CLAUDE.md「Supabase／資料庫慣例」）。
// 登入時順便查未讀通知數（7.0），給導覽列的鈴鐺顯示；GlobalNav 是 client component，不能自己查資料庫。
export async function SiteNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let auth: NavAuth = "guest";
  let unreadCount = 0;
  if (user) {
    const [{ data: coach }, { count }] = await Promise.all([
      supabase.from("coach_profiles").select("application_status").eq("id", user.id).maybeSingle(),
      // 只要數量、不取內容；RLS 只讓使用者看到自己的通知
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false),
    ]);
    auth = coach?.application_status === "approved" ? "coach" : "user";
    unreadCount = count ?? 0;
  }

  return <GlobalNav auth={auth} unreadCount={unreadCount} />;
}
