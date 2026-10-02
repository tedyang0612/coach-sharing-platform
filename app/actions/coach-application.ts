"use server";

import { redirect } from "next/navigation";
import { COACH_PHOTO_BUCKET } from "@/lib/coach-application/constants";
import { formatEducation, type EducationEntry } from "@/lib/coach-application/education";
import { hasErrors, validateCoachApplication } from "@/lib/coach-application/validation";
import { createClient } from "@/lib/supabase/server";

// 檔案已經由瀏覽器直接傳到 Storage，這裡只收路徑
export type CoachApplicationPayload = {
  // 重新送審時留空字串代表沿用先前上傳的檔案
  photoPath: string;
  criminalRecordPath: string;
  sportCategories: string[];
  tags: string[];
  education: EducationEntry[];
  workExperience: string;
  bioCompetition: string;
  bioIntro: string;
  contactPhone: string;
  contactLine: string;
  contactSocial: string;
  // 這次新增的證照
  licenses: { name: string; filePath: string }[];
  // 重新送審時要移除的舊證照
  removedLicenseIds: string[];
  consent: boolean;
};

// 成功時直接導向申請狀態頁；只有失敗才會回傳
export type CoachApplicationResult = { error: string };

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// 只接受放在自己資料夾底下的檔案，避免把別人的檔案路徑寫進自己的申請
function isOwnPath(path: string, userId: string): boolean {
  return path.startsWith(`${userId}/`) && !path.includes("..");
}

/**
 * 送出教練申請（PRD 4.0）。
 * - 還沒申請過：新增一筆申請，狀態為審核中。
 * - 狀態是需補件／未通過：更新同一筆申請，資料庫的 trigger 會把狀態改回審核中（AC 8）。
 */
export async function submitCoachApplication(
  payload: CoachApplicationPayload
): Promise<CoachApplicationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "登入已過期，請重新登入後再送出。" };

  // 聯絡方式、良民證這些審核欄位不能直接 select，要透過 function 讀自己的完整申請；
  // 還沒申請過時回傳 null 或每個欄位都是 null 的一筆資料，所以用 id 判斷
  const { data: currentRow } = await supabase.rpc("get_my_coach_application");
  const current = currentRow?.id ? currentRow : null;

  if (
    current &&
    current.application_status !== "needs_more_info" &&
    current.application_status !== "rejected"
  ) {
    return { error: "你的申請目前無法修改，請到申請狀態頁查看。" };
  }

  const keepsCriminalRecord =
    Boolean(current?.criminal_record_url) && !current?.criminal_record_deleted;

  // 第二道防線：表單送出前已經檢查過，這裡用同一套規則再檢查一次
  const errors = validateCoachApplication({
    hasPhoto: payload.photoPath !== "" || Boolean(current?.photo_url),
    hasCriminalRecord: payload.criminalRecordPath !== "" || keepsCriminalRecord,
    sportCategories: payload.sportCategories,
    tags: payload.tags,
    education: payload.education,
    workExperience: payload.workExperience,
    bioCompetition: payload.bioCompetition,
    bioIntro: payload.bioIntro,
    contactPhone: payload.contactPhone,
    contactLine: payload.contactLine,
    contactSocial: payload.contactSocial,
    licenses: payload.licenses.map((license) => ({
      name: license.name,
      hasFile: license.filePath !== "",
    })),
    consent: payload.consent,
  });
  if (hasErrors(errors)) {
    return { error: "填寫內容有誤，請重新檢查表單後再送出。" };
  }

  const newPaths = [
    payload.photoPath,
    payload.criminalRecordPath,
    ...payload.licenses.map((license) => license.filePath),
  ].filter((path) => path !== "");
  if (!newPaths.every((path) => isOwnPath(path, user.id))) {
    return { error: "檔案資訊有誤，請重新上傳後再送出。" };
  }

  const fields = {
    sport_categories: payload.sportCategories,
    tags: payload.tags.map((tag) => tag.trim()),
    // 年資欄位已從表單拿掉（改由「工作／教學經歷」說明），固定清空
    years_experience: null,
    // 學歷與工作／教學經歷一起存在學經歷欄位（格式見 lib/coach-application/education.ts）
    bio_education: formatEducation(payload.education, payload.workExperience),
    bio_competition: emptyToNull(payload.bioCompetition),
    bio_intro: payload.bioIntro.trim(),
    contact_phone: emptyToNull(payload.contactPhone),
    contact_line: emptyToNull(payload.contactLine),
    // contact_email 不再由表單填寫（Email 一律用註冊帳號的信箱），固定清空
    contact_email: null,
    contact_social: emptyToNull(payload.contactSocial),
    // 個人照片是公開 bucket，存可以直接顯示的網址；良民證與證照是私有 bucket，只存路徑
    ...(payload.photoPath && {
      photo_url: supabase.storage.from(COACH_PHOTO_BUCKET).getPublicUrl(payload.photoPath).data
        .publicUrl,
    }),
    ...(payload.criminalRecordPath && {
      criminal_record_url: payload.criminalRecordPath,
      criminal_record_uploaded_at: new Date().toISOString(),
      criminal_record_deleted: false,
    }),
  };

  if (!current) {
    // application_status 預設 pending、consent_at 預設 now()，由資料庫帶入
    const { error } = await supabase.from("coach_profiles").insert({ id: user.id, ...fields });
    if (error) return { error: "申請送出失敗，請稍後再試。" };
  }

  // 證照先處理，申請本體最後才更新：更新本體的那一刻狀態才會回到審核中
  if (current && payload.removedLicenseIds.length > 0) {
    // 資料庫 policy 只允許刪自己「還沒通過」的證照，已通過的就算送了 id 也刪不掉
    const { error } = await supabase
      .from("coach_licenses")
      .delete()
      .eq("coach_id", user.id)
      .in("id", payload.removedLicenseIds);
    if (error) return { error: "證照移除失敗，請稍後再試。" };
  }

  let licenseFailed = false;
  if (payload.licenses.length > 0) {
    const { error } = await supabase.from("coach_licenses").insert(
      payload.licenses.map((license) => ({
        coach_id: user.id,
        name: license.name.trim(),
        file_url: license.filePath,
      }))
    );
    licenseFailed = Boolean(error);
  }

  if (current) {
    const { error } = await supabase
      .from("coach_profiles")
      .update({ ...fields, consent_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) return { error: "重新送審失敗，請稍後再試。" };
  }

  if (licenseFailed) {
    // 申請本體已經送出，只有新證照沒存到；證照是選填，不影響身分審核
    return {
      error: "申請已送出，但新增的證照儲存失敗。請到申請狀態頁確認，或聯繫平台協助補上證照。",
    };
  }

  redirect("/coach/application");
}
