/* eslint-disable @next/next/no-img-element -- 封面圖可能是 Supabase Storage 網址，原因同 cover-picker.tsx */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { NotCoachNotice, PageShell } from "@/app/courses/_components/page-shell";
import { resolveCoverUrl } from "@/app/courses/_lib/cover-image";
import { formatDate, formatPrice, formatTimeRange } from "@/app/courses/_lib/format";
import { getCoachContext, getMyCourse } from "@/app/courses/_lib/queries";
import { SESSION_DISPLAY_LABELS, sessionDisplayStatus } from "@/app/courses/_lib/session-rules";

/**
 * 單一課程的教練管理頁。PR2 先做發布後的落地頁（課程資訊＋場次列表）；
 * 學員名單、取消場次、編輯、群發公告掛勾在 PR3 補上。
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

  return (
    <PageShell
      title={course.title}
      description={`${course.sport_type}｜${course.location_name}`}
      back={{ href: "/coach/courses", label: "我的課程" }}
      actions={
        <Link
          href={`/coach/courses/new?from=${course.id}`}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
        >
          複製課程
        </Link>
      }
    >
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

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-neutral-900">場次（{course.sessions.length}）</h2>
        {course.sessions.length === 0 ? (
          <p className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500">這堂課目前沒有場次。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {course.sessions.map((s) => {
              const status = sessionDisplayStatus(s);
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm"
                >
                  <div>
                    <p className="font-semibold text-neutral-900">{formatTimeRange(s.start_at, s.end_at)}</p>
                    <p className="text-xs text-neutral-500">
                      已報名 {s.active_count}／{course.max_participants} 人
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      status === "recruiting"
                        ? "bg-brand-ink text-brand"
                        : status === "matched"
                          ? "bg-sky-50 text-sky-700"
                          : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {SESSION_DISPLAY_LABELS[status]}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
