import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AnnouncementHistory } from "@/components/announcements/announcement-history";
import { ACTIVE_REGISTRATION_STATUSES } from "@/lib/announcements/constants";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementForm } from "./announcement-form";

export const metadata: Metadata = {
  title: "發布課程公告｜夠練 GoLand",
};

// 時間一律指定台灣時區顯示（CLAUDE.md 時間與時區慣例）
function formatTaipeiTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/**
 * 教練對單一場次的報名學員群發公告（PRD 7.0 規格 4）。
 * 入口在教練工作台的課程管理頁（1.0）：每個場次放一個連到這裡的「發公告」按鈕即可。
 */
export default async function SessionAnnouncementsPage({
  params,
}: PageProps<"/coach/sessions/[id]/announcements">) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=${encodeURIComponent(`/coach/sessions/${sessionId}/announcements`)}`
    );
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, start_at, courses!inner(title, location_name, coach_id)")
    .eq("id", sessionId)
    .maybeSingle();
  // 巢狀查詢的結果型別依關聯方向可能是物件或陣列，兩種都處理
  const course = session
    ? ([session.courses].flat()[0] as
        | { title: string; location_name: string; coach_id: string }
        | undefined)
    : undefined;

  // 場次不存在，或不是自己開的課：一律當作找不到（PRD 7.0 AC 4）
  if (!session || !course || course.coach_id !== user.id) notFound();

  const [{ count }, { data: announcements }] = await Promise.all([
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session.id)
      .in("status", ACTIVE_REGISTRATION_STATUSES),
    supabase
      .from("announcements")
      .select("id, content, sent_at")
      .eq("session_id", session.id)
      .order("sent_at", { ascending: false }),
  ]);
  const recipientCount = count ?? 0;

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold text-neutral-900">發布課程公告</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {course.title}・{formatTaipeiTime(session.start_at)}・{course.location_name}
          </p>
          <p className="mt-2 text-sm text-neutral-700">
            {recipientCount > 0
              ? `目前有 ${recipientCount} 位報名學員會收到公告。`
              : "這個場次目前沒有報名學員，無法發送公告。"}
          </p>
        </header>

        <AnnouncementForm sessionId={session.id} recipientCount={recipientCount} />

        <AnnouncementHistory
          announcements={(announcements ?? []).map((announcement) => ({
            id: announcement.id,
            content: announcement.content,
            sentAt: announcement.sent_at,
          }))}
        />
      </div>
    </main>
  );
}
