// 「我的課程」的資料讀取（Server Component 用）。
// 不放在 "use server" 檔案裡；被 client component 引用會因為 next/headers 編譯失敗，頁面請在伺服器端呼叫。

import { createClient } from "@/lib/supabase/server";
import {
  buildMyRegistrationItem,
  type MyAnnouncement,
  type MyRegistrationItem,
  type MyRegistrationRow,
  type MyReview,
} from "./my-registrations";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * 這位學員的所有報名，連同場次、課程、教練對該場次的公告、自己送出的評價。回傳未分組、依報名時間新到舊，
 * 頁面用 my-registrations.ts 的 groupMyRegistrations() 分成四類。
 *
 * 注意：
 * - 課程若已下架（RLS 讀不到），報名仍會回傳，標題顯示「（課程已下架）」，不會憑空消失。
 * - 公告的 RLS：教練本人與該場次「未取消」報名的學員才讀得到，所以已取消的報名不會有公告。
 * - 評價用 reviewer_id 過濾，只取自己送出的。
 */
export async function listMyRegistrations(
  supabase: SupabaseServerClient,
  userId: string,
  now: Date = new Date()
): Promise<MyRegistrationItem[]> {
  const { data: regs } = await supabase
    .from("registrations")
    .select(
      "id, status, amount, refund_amount, refund_fee_amount, created_at, session:sessions(id, start_at, end_at, registration_deadline_at, status, course:courses(id, title, sport_type, location_name, location_address, cover_image_url, coach_id, min_participants, max_participants))"
    )
    .eq("learner_id", userId)
    .order("created_at", { ascending: false });

  const rows = (regs ?? []) as unknown as MyRegistrationRow[];
  if (rows.length === 0) return [];

  const sessionIds = [...new Set(rows.map((r) => r.session?.id).filter((id): id is string => !!id))];
  const registrationIds = rows.map((r) => r.id);

  // 只有「待確認開課」的卡片要顯示進度，其他不必多查
  const pendingSessionIds = [
    ...new Set(rows.filter((r) => r.status === "pending_match" && r.session).map((r) => r.session!.id)),
  ];

  const [{ data: announcementRows }, { data: reviewRows }, { data: countRows }] = await Promise.all([
    sessionIds.length > 0
      ? supabase.from("announcements").select("id, session_id, content, sent_at").in("session_id", sessionIds)
      : Promise.resolve({ data: [] as { id: string; session_id: string; content: string; sent_at: string }[] }),
    supabase
      .from("reviews")
      .select("registration_id, rating, comment, created_at")
      .eq("reviewer_id", userId)
      .in("registration_id", registrationIds),
    pendingSessionIds.length > 0
      ? supabase.rpc("get_session_enrollment_counts", { p_session_ids: pendingSessionIds })
      : Promise.resolve({ data: [] as { session_id: string; enrolled_count: number }[] }),
  ]);

  const enrolledBySession = new Map<string, number>(
    (countRows ?? []).map((c: { session_id: string; enrolled_count: number }) => [c.session_id, c.enrolled_count])
  );

  const announcementsBySession = new Map<string, MyAnnouncement[]>();
  for (const a of announcementRows ?? []) {
    const list = announcementsBySession.get(a.session_id) ?? [];
    list.push({ id: a.id, content: a.content, sent_at: a.sent_at });
    announcementsBySession.set(a.session_id, list);
  }

  const reviewsByRegistration = new Map<string, MyReview>();
  for (const r of reviewRows ?? []) {
    reviewsByRegistration.set(r.registration_id, { rating: r.rating, comment: r.comment, created_at: r.created_at });
  }

  return rows.map((row) =>
    buildMyRegistrationItem(
      row,
      row.session ? (announcementsBySession.get(row.session.id) ?? []) : [],
      reviewsByRegistration.get(row.id) ?? null,
      now,
      row.session?.course && enrolledBySession.has(row.session.id)
        ? {
            enrolled: enrolledBySession.get(row.session.id)!,
            minParticipants: row.session.course.min_participants,
            maxParticipants: row.session.course.max_participants,
          }
        : null
    )
  );
}
