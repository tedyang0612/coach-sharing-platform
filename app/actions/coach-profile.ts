"use server";

import { revalidatePath } from "next/cache";
import { COACH_PHOTO_BUCKET } from "@/lib/coach-application/constants";
import { formatEducation, type EducationEntry } from "@/lib/coach-application/education";
import { hasErrors, validateCoachPublicProfile } from "@/lib/coach-application/validation";
import { createClient } from "@/lib/supabase/server";

export type CoachProfilePayload = {
  // 留空字串代表沿用目前的照片；有值是剛上傳到 Storage 的路徑
  photoPath: string;
  sportCategories: string[];
  tags: string[];
  education: EducationEntry[];
  workExperience: string;
  bioCompetition: string;
  bioIntro: string;
};

export type CoachProfileResult = { ok: true } | { ok: false; error: string };

/**
 * 審核通過的教練編輯自己的公開個人檔案（PRD 9.0 規格 4）。
 * 只會動公開欄位；聯絡方式、良民證、審核狀態都不在這裡處理。
 */
export async function updateCoachProfile(
  payload: CoachProfilePayload
): Promise<CoachProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "登入已過期，請重新登入後再儲存。" };

  const { data: current } = await supabase
    .from("coach_profiles")
    .select("application_status, photo_url")
    .eq("id", user.id)
    .maybeSingle();
  if (!current || current.application_status !== "approved") {
    return { ok: false, error: "只有審核通過的教練可以編輯個人檔案。" };
  }

  // 第二道防線：和申請表單共用同一套公開欄位規則（含禁填聯絡資訊）
  const errors = validateCoachPublicProfile({
    hasPhoto: payload.photoPath !== "" || Boolean(current.photo_url),
    sportCategories: payload.sportCategories,
    tags: payload.tags,
    education: payload.education,
    workExperience: payload.workExperience,
    bioCompetition: payload.bioCompetition,
    bioIntro: payload.bioIntro,
  });
  if (hasErrors(errors)) {
    return { ok: false, error: "填寫內容有誤，請重新檢查後再儲存。" };
  }

  // 只接受放在自己資料夾底下的照片
  if (
    payload.photoPath !== "" &&
    (!payload.photoPath.startsWith(`${user.id}/`) || payload.photoPath.includes(".."))
  ) {
    return { ok: false, error: "照片資訊有誤，請重新上傳後再儲存。" };
  }

  const competition = payload.bioCompetition.trim();
  const { error } = await supabase
    .from("coach_profiles")
    .update({
      sport_categories: payload.sportCategories,
      tags: payload.tags.map((tag) => tag.trim()),
      bio_education: formatEducation(payload.education, payload.workExperience),
      bio_competition: competition === "" ? null : competition,
      bio_intro: payload.bioIntro.trim(),
      ...(payload.photoPath && {
        photo_url: supabase.storage.from(COACH_PHOTO_BUCKET).getPublicUrl(payload.photoPath).data
          .publicUrl,
      }),
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: "儲存失敗，請稍後再試。" };

  // 儲存後公開頁與編輯頁都要立刻看到新內容（PRD 9.0 AC 3）
  revalidatePath(`/coaches/${user.id}`);
  revalidatePath("/coach/profile");
  return { ok: true };
}
