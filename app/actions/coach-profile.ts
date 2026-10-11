"use server";

import { revalidatePath } from "next/cache";
import { COACH_PHOTO_BUCKET } from "@/lib/coach-application/constants";
import { formatEducation, type EducationEntry } from "@/lib/coach-application/education";
import {
  hasErrors,
  resolveCoachDisplayName,
  validateCoachProfileEdit,
} from "@/lib/coach-application/validation";
import { createClient } from "@/lib/supabase/server";

export type CoachProfilePayload = {
  // 只能改暱稱；真實姓名是核對良民證用的，通過審核後不開放自行修改
  nickname: string;
  // 留空字串代表沿用目前的照片；有值是剛上傳到 Storage 的路徑
  photoPath: string;
  lifestylePhotoPath: string;
  sportCategories: string[];
  tags: string[];
  education: EducationEntry[];
  workExperience: string;
  bioCompetition: string;
  bioIntro: string;
  contactPhone: string;
  contactLine: string;
  contactSocial: string;
  // 這次新增、要送審的證照
  newLicenses: { name: string; filePath: string }[];
  // 要移除的舊證照（只有還沒通過的能移除）
  removedLicenseIds: string[];
};

export type CoachProfileResult = { ok: true } | { ok: false; error: string };

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function isOwnPath(path: string, userId: string): boolean {
  return path.startsWith(`${userId}/`) && !path.includes("..");
}

/**
 * 審核通過的教練編輯自己的個人檔案（PRD 9.0 規格 4）：
 * 公開欄位、聯絡方式都可以改，也可以追加證照送審；良民證與審核狀態不在這裡處理。
 */
export async function updateCoachProfile(
  payload: CoachProfilePayload
): Promise<CoachProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "登入已過期，請重新登入後再儲存。" };

  // 真實姓名不在 select 白名單內，要透過 function 讀自己的完整資料
  const { data: currentRow } = await supabase.rpc("get_my_coach_application");
  const current = currentRow?.id ? currentRow : null;
  if (!current || current.application_status !== "approved") {
    return { ok: false, error: "只有審核通過的教練可以編輯個人檔案。" };
  }

  // 第二道防線：和申請表單共用同一套規則（含禁填聯絡資訊、聯絡方式至少一項、證照要有名稱）
  const errors = validateCoachProfileEdit({
    realName: current.real_name ?? "",
    nickname: payload.nickname,
    hasPhoto: payload.photoPath !== "" || Boolean(current.photo_url),
    hasLifestylePhoto:
      payload.lifestylePhotoPath !== "" || Boolean(current.lifestyle_photo_url),
    sportCategories: payload.sportCategories,
    tags: payload.tags,
    education: payload.education,
    workExperience: payload.workExperience,
    bioCompetition: payload.bioCompetition,
    bioIntro: payload.bioIntro,
    contactPhone: payload.contactPhone,
    contactLine: payload.contactLine,
    contactSocial: payload.contactSocial,
    licenses: payload.newLicenses.map((license) => ({
      name: license.name,
      hasFile: license.filePath !== "",
    })),
  });
  if (hasErrors(errors)) {
    return { ok: false, error: "填寫內容有誤，請重新檢查後再儲存。" };
  }

  // 只接受放在自己資料夾底下的檔案
  const newPaths = [
    payload.photoPath,
    payload.lifestylePhotoPath,
    ...payload.newLicenses.map((license) => license.filePath),
  ].filter((path) => path !== "");
  if (!newPaths.every((path) => isOwnPath(path, user.id))) {
    return { ok: false, error: "檔案資訊有誤，請重新上傳後再儲存。" };
  }

  const { error: profileError } = await supabase
    .from("coach_profiles")
    .update({
      display_name: resolveCoachDisplayName(current.real_name ?? "", payload.nickname),
      sport_categories: payload.sportCategories,
      tags: payload.tags.map((tag) => tag.trim()),
      bio_education: formatEducation(payload.education, payload.workExperience),
      bio_competition: emptyToNull(payload.bioCompetition),
      bio_intro: payload.bioIntro.trim(),
      contact_phone: emptyToNull(payload.contactPhone),
      contact_line: emptyToNull(payload.contactLine),
      contact_social: emptyToNull(payload.contactSocial),
      ...(payload.photoPath && {
        photo_url: supabase.storage.from(COACH_PHOTO_BUCKET).getPublicUrl(payload.photoPath).data
          .publicUrl,
      }),
      ...(payload.lifestylePhotoPath && {
        lifestyle_photo_url: supabase.storage
          .from(COACH_PHOTO_BUCKET)
          .getPublicUrl(payload.lifestylePhotoPath).data.publicUrl,
      }),
    })
    .eq("id", user.id);
  if (profileError) return { ok: false, error: "儲存失敗，請稍後再試。" };

  // 儲存後公開頁與編輯頁都要立刻看到新內容（PRD 9.0 AC 3）
  revalidatePath(`/coaches/${user.id}`);
  revalidatePath("/coach/profile");

  if (payload.removedLicenseIds.length > 0) {
    // 資料庫 policy 只允許刪自己「還沒通過」的證照，已通過的就算送了 id 也刪不掉
    const { error } = await supabase
      .from("coach_licenses")
      .delete()
      .eq("coach_id", user.id)
      .in("id", payload.removedLicenseIds);
    if (error) return { ok: false, error: "個人檔案已儲存，但證照移除失敗，請稍後再試。" };
  }

  if (payload.newLicenses.length > 0) {
    // 新證照的狀態預設是審核中，通過後資料庫會自動更新「已認證」徽章
    const { error } = await supabase.from("coach_licenses").insert(
      payload.newLicenses.map((license) => ({
        coach_id: user.id,
        name: license.name.trim(),
        file_url: license.filePath,
      }))
    );
    if (error) return { ok: false, error: "個人檔案已儲存，但新增的證照送審失敗，請稍後再試。" };
  }

  return { ok: true };
}
