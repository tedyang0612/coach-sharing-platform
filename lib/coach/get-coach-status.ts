import { createClient } from "@/lib/supabase/server";
import type { CoachApplicationStatus } from "@/types/database";

export type CoachStatus = {
  isLoggedIn: boolean;
  // null 代表還沒申請過
  applicationStatus: CoachApplicationStatus | null;
  // 只有審核通過才算教練，才能看教練工作台、建立課程（PRD 4.0 AC 1）
  isApprovedCoach: boolean;
};

/**
 * 查詢目前登入者的教練身分，給 Server Component／Server Action 用。
 * 例：教練工作台入口要不要顯示、工作台頁面要不要擋。
 *
 *   const { isApprovedCoach } = await getCoachStatus();
 *   if (!isApprovedCoach) redirect("/coach/application");
 *
 * 這裡只是畫面層的判斷；真正擋住「未通過審核建立課程」的是 courses 的 RLS policy。
 */
export async function getCoachStatus(): Promise<CoachStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isLoggedIn: false, applicationStatus: null, isApprovedCoach: false };
  }

  const { data } = await supabase
    .from("coach_profiles")
    .select("application_status")
    .eq("id", user.id)
    .maybeSingle();

  const applicationStatus = (data?.application_status ?? null) as CoachApplicationStatus | null;

  return {
    isLoggedIn: true,
    applicationStatus,
    isApprovedCoach: applicationStatus === "approved",
  };
}
