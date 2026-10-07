"use server";

import { revalidatePath } from "next/cache";
import { contactInfoWarning } from "@/lib/coach-application/validation";
import {
  formatReviewComment,
  REVIEW_TAG_MAX,
  sanitizeReviewTags,
} from "@/lib/reviews/review-tags";
import { createClient } from "@/lib/supabase/server";

// 文字心得的長度上限。PRD 沒有規定，先設一個合理的上限避免貼入過長內容
const COMMENT_MAX_LENGTH = 500;

export type ReviewPayload = {
  registrationId: string;
  rating: number;
  // 學員點選的評價 Tag，最多 3 個
  tags: string[];
  comment: string;
};

export type ReviewResult = { ok: true } | { ok: false; error: string };

/**
 * 學員送出課後評價（PRD 5.0）：只有「課程完成」的訂單能評，每筆訂單一次。
 * 資料庫的 RLS 與 unique(registration_id) 也會擋，這裡先檢查是為了給使用者看得懂的訊息。
 */
export async function submitReview(payload: ReviewPayload): Promise<ReviewResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "登入已過期，請重新登入後再送出。" };

  if (!Number.isInteger(payload.rating) || payload.rating < 1 || payload.rating > 5) {
    return { ok: false, error: "請選擇 1 到 5 星的評分。" };
  }
  // 只接受清單內的 Tag；送來的數量超過上限或夾帶清單外的字串都視為錯誤
  const tags = sanitizeReviewTags(payload.tags);
  if (payload.tags.length > REVIEW_TAG_MAX || tags.length !== payload.tags.length) {
    return { ok: false, error: `評價 Tag 最多選 ${REVIEW_TAG_MAX} 個。` };
  }
  const comment = payload.comment.trim();
  if (comment.length > COMMENT_MAX_LENGTH) {
    return { ok: false, error: `文字心得最多 ${COMMENT_MAX_LENGTH} 個字。` };
  }
  // 心得會公開顯示在教練個人檔案，和其他公開欄位一樣不能留聯絡資訊（避免繞過平台私下交易）
  const contactWarning = contactInfoWarning(comment);
  if (contactWarning) return { ok: false, error: contactWarning };

  // 被評價的教練一律從訂單所屬的課程查出來，不採用前端傳來的值
  const { data: registration } = await supabase
    .from("registrations")
    .select("id, status, sessions!inner(course_id, courses!inner(coach_id))")
    .eq("id", payload.registrationId)
    .eq("learner_id", user.id)
    .maybeSingle();
  if (!registration) return { ok: false, error: "找不到這筆訂單。" };
  if (registration.status !== "completed") {
    return { ok: false, error: "課程完成後才能評價。" };
  }

  // 巢狀查詢的結果型別依關聯方向可能是物件或陣列，兩種都處理
  const session = [registration.sessions].flat()[0] as
    | { course_id: string; courses: { coach_id: string } | { coach_id: string }[] }
    | undefined;
  const course = session ? [session.courses].flat()[0] : undefined;
  if (!session || !course) return { ok: false, error: "找不到這筆訂單對應的課程。" };

  const { error } = await supabase.from("reviews").insert({
    registration_id: registration.id,
    coach_id: course.coach_id,
    reviewer_id: user.id,
    rating: payload.rating,
    // Tag 與文字心得一起存在 comment（格式見 lib/reviews/review-tags.ts）
    comment: formatReviewComment(tags, comment),
  });
  if (error) {
    // 23505 = unique 違規，代表這筆訂單已經評價過
    if (error.code === "23505") return { ok: false, error: "這筆訂單已經評價過了。" };
    return { ok: false, error: "評價送出失敗，請稍後再試。" };
  }

  // 評價回流教練個人檔案與評價頁（PRD 5.0 AC 2）
  revalidatePath(`/coaches/${course.coach_id}`);
  revalidatePath(`/courses/${session.course_id}/review`);
  return { ok: true };
}
