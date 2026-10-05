import { createClient } from "@/lib/supabase/server";
import { GlobalNav, type NavAuth } from "./global-nav";

// 伺服器端判斷身分後交給 GlobalNav：
// 未登入＝guest；登入且教練申請已通過（coach_profiles.application_status = approved）＝coach；其餘登入者＝user。
// 身分是動態判斷的，profiles 沒有 role 欄位（見 CLAUDE.md「Supabase／資料庫慣例」）。
export async function SiteNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let auth: NavAuth = "guest";
  if (user) {
    const { data: coach } = await supabase
      .from("coach_profiles")
      .select("application_status")
      .eq("id", user.id)
      .maybeSingle();
    auth = coach?.application_status === "approved" ? "coach" : "user";
  }

  return <GlobalNav auth={auth} />;
}
