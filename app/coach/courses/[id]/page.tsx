/* eslint-disable @next/next/no-img-element -- 封面圖可能是 Supabase Storage 網址，原因同 cover-picker.tsx */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CancelSessionButton, SaveAsTemplateButton } from "@/app/courses/_components/course-actions";
import { NotCoachNotice, PageShell } from "@/app/courses/_components/page-shell";
import { SessionStatusBadge } from "@/app/courses/_components/status-badge";
import { COURSE_LEVELS } from "@/app/courses/_lib/course-input";
import { resolveCoverUrl } from "@/app/courses/_lib/cover-image";
import { formatDate, formatDateTime, formatPrice, formatTimeRange } from "@/app/courses/_lib/format";
import { getCoachContext, getMyCourse, isCourseEditLocked, type SessionWithRoster } from "@/app/courses/_lib/queries";
import {
  REGISTRATION_STATUS_LABELS,
  canCoachCancelSession,
  isActiveRegistration,
  sessionDisplayStatus,
} from "@/app/courses/_lib/session-rules";

const SECONDARY_BUTTON =
  "rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-50";

/**
 * 課程管理頁（PRD 1.0 規格4）：課程資訊、各場次即時報名人數與學員名單（只有暱稱與報名時間）、
 * 取消場次（規格7，符合條件才顯示按鈕）、編輯／另存範本／複製，以及群發公告入口（連到 7.0 的公告頁）。
 */
export default async function CoachCoursePage({ params }: PageProps<"/coach/courses/[id]">) {
  const { id } = await params;

  const ctx = await getCoachContext();
  if (!ctx.ok && ctx.reason === "unauthenticated") {
    redirect(`/login?redirect=${encodeURIComponent(`/coach/courses/${id}`)}`);
  }
  if (!ctx.ok) {
    return (
      <PageShell title="課程管理">
        <NotCoachNotice />
      </PageShell>
    );
  }

  const course = await getMyCourse(ctx, id);
  if (!course) notFound();

  const locked = isCourseEditLocked(course);
  const levelLabel = COURSE_LEVELS.find((l) => l.value === course.level)?.label ?? course.level;
  const now = new Date();

  return (
    <PageShell
      title={course.title}
      description={`${course.sport_type}｜${levelLabel}｜${course.location_name}`}
      back={{ href: course.is_template ? "/coach/courses?view=templates" : "/coach/courses", label: "我的課程" }}
      actions={
        <div className="flex flex-wrap items-start gap-2">
          {course.is_template ? (
            <Link href={`/coach/courses/new?from=${course.id}`} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-90">
              套用範本開課
            </Link>
          ) : (
            <>
              <SaveAsTemplateButton courseId={course.id} />
              <Link href={`/coach/courses/new?from=${course.id}`} className={SECONDARY_BUTTON}>
                複製課程
              </Link>
            </>
          )}
          {course.status !== "cancelled" && (
            <Link href={`/coach/courses/${course.id}/edit`} className={SECONDARY_BUTTON}>
              {course.is_template ? "編輯範本" : "編輯課程"}
            </Link>
          )}
        </div>
      }
    >
      {course.is_template && (
        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
          這是課程範本，不會公開、也不會產生場次。套用範本開課時，除日期外的設定都會自動帶入。
        </div>
      )}
      {locked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          已有學員報名，時段、地點、價格與人數已鎖定，只能修改課程須知與封面圖。
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <img src={resolveCoverUrl(course)} alt="" className="aspect-[21/9] w-full object-cover" />
        <dl className="grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-neutral-500">上課日期</dt>
            <dd className="font-semibold text-neutral-900">
              {course.sessions[0] ? formatDate(course.sessions[0].start_at) : course.session_date}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">每人費用</dt>
            <dd className="font-semibold text-neutral-900">{formatPrice(course.price_per_person)}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">人數</dt>
            <dd className="font-semibold text-neutral-900">
              {course.min_participants}–{course.max_participants} 人
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">報名截止</dt>
            <dd className="font-semibold text-neutral-900">開課前 {course.registration_deadline_hours} 小時</dd>
          </div>
        </dl>
      </div>

      {!course.is_template && (
        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-base font-bold text-neutral-900">場次（{course.sessions.length}）</h2>
            <p className="text-xs text-neutral-500">名單只顯示學員暱稱與報名時間</p>
          </div>
          {course.sessions.length === 0 ? (
            <p className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500">這堂課目前沒有場次。</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {course.sessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  minParticipants={course.min_participants}
                  maxParticipants={course.max_participants}
                  now={now}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </PageShell>
  );
}

function SessionCard({
  session,
  minParticipants,
  maxParticipants,
  now,
}: {
  session: SessionWithRoster;
  minParticipants: number;
  maxParticipants: number;
  now: Date;
}) {
  const status = sessionDisplayStatus(session, now);
  const timeLabel = formatTimeRange(session.start_at, session.end_at);
  const cancel = canCoachCancelSession(session, session.active_count);
  // 名單：有效報名在前，已取消／退款的放後面並淡化
  const roster = [...session.roster].sort(
    (a, b) => Number(isActiveRegistration(b.status)) - Number(isActiveRegistration(a.status))
  );
  const remaining = Math.max(0, minParticipants - session.active_count);

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold text-neutral-900">{timeLabel}</p>
            <SessionStatusBadge status={status} />
          </div>
          <p className="mt-0.5 text-sm text-neutral-600">
            已報名 <span className="font-bold text-neutral-900">{session.active_count}</span>／{maxParticipants} 人
            {status === "recruiting" && (
              <span className="text-neutral-500">
                {remaining > 0 ? `（還差 ${remaining} 人達開課人數）` : "（已達開課人數）"}
              </span>
            )}
          </p>
          <p className="text-xs text-neutral-500">報名截止：{formatDateTime(session.registration_deadline_at)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          {cancel.ok ? (
            <CancelSessionButton sessionId={session.id} timeLabel={timeLabel} activeCount={session.active_count} />
          ) : (
            status === "recruiting" && <p className="text-xs text-neutral-400">{cancel.reason}</p>
          )}
          {(status === "recruiting" || status === "matched") && (
            // 7.0 群發公告頁（牛牛，PR #12）：每個場次一個網址；頁面自己檢查是不是這堂課的教練、有沒有報名學員。
            // PR #12 合併前這個連結會是 404。
            <Link
              href={`/coach/sessions/${session.id}/announcements`}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-700 transition hover:bg-neutral-50"
            >
              群發公告
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-neutral-50 px-4 py-3">
        <p className="text-xs font-semibold text-neutral-500">學員名單</p>
        {roster.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-500">目前還沒有學員報名。</p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-200">
            {roster.map((r) => {
              const active = isActiveRegistration(r.status);
              return (
                <li key={r.id} className={`flex flex-wrap items-center justify-between gap-2 py-2 text-sm ${active ? "" : "opacity-50"}`}>
                  <span className="font-semibold text-neutral-900">{r.display_name}</span>
                  <span className="flex items-center gap-3 text-xs text-neutral-500">
                    <span>報名時間 {formatDateTime(r.created_at)}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-neutral-600">
                      {REGISTRATION_STATUS_LABELS[r.status]}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </li>
  );
}
