import Link from "next/link";
import { formatPrice, formatSessionTime } from "@/app/courses/_lib/format";
import { CoachLocalNav } from "@/components/coach/coach-local-nav";
import { buttonClassName } from "@/components/ui/button";
import type { UpcomingSession } from "../_lib/overview";

export type OverviewStat = { label: string; value: string; note: string };

// 近期場次最多先列這麼多筆，其餘到課程管理看
const UPCOMING_LIMIT = 6;

/** 教練總覽的畫面（設計稿 C02｜P17）。只負責顯示，資料由 app/coach/page.tsx 準備。 */
export function CoachOverviewView({
  stats,
  upcoming,
}: {
  stats: OverviewStat[];
  upcoming: UpcomingSession[];
}) {
  return (
    <main className="flex flex-1 flex-col gap-6 px-[var(--spacing-screen-padding)] pb-20 pt-6 md:pt-8">
      <CoachLocalNav active="overview" />

      <div className="flex w-full flex-col gap-6">
        <section aria-label="收益與場次摘要" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-1 rounded-lg border border-border-default bg-brand-white p-5"
            >
              <p className="text-caption text-text-secondary">{stat.label}</p>
              <p className="text-display text-text-primary">{stat.value}</p>
              <p className="text-caption text-text-secondary">{stat.note}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-h2 text-text-primary">近期場次</h2>
            <Link
              href="/coach/courses"
              className="text-label text-brand-deep underline underline-offset-4"
            >
              查看全部課程
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border-default bg-brand-white p-8 text-center">
              <p className="text-body text-text-secondary">目前沒有招生中或確定開課的場次。</p>
              <Link href="/coach/courses/new" className={buttonClassName("secondary")}>
                建立第一堂課
              </Link>
            </div>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {upcoming.slice(0, UPCOMING_LIMIT).map((item) => (
                <li key={item.session.id}>
                  <SessionCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function SessionCard({ item }: { item: UpcomingSession }) {
  const { course, session, status } = item;
  const count = session.active_count;
  const manageHref = `/coach/courses/${course.id}`;
  const statusText =
    status === "matched"
      ? `確定開課・${count} 人`
      : count > 0
        ? `招生中・已報名 ${count} 人`
        : "招生中・尚無人報名";
  const progress = Math.min(100, Math.round((count / course.max_participants) * 100));

  return (
    <article className="flex h-full flex-col gap-3 rounded-lg border border-border-default bg-brand-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h3 truncate text-text-primary">{course.title}</h3>
          <p className="text-body-small mt-1 text-text-secondary">
            {formatSessionTime(session.start_at, session.end_at)}・{course.location_name}
          </p>
        </div>
        <p className="text-body shrink-0 text-text-primary">{formatPrice(course.price_per_person)} / 人</p>
      </div>

      <p className="text-label flex items-center gap-2 text-text-primary">
        <span
          aria-hidden="true"
          className={`size-2 rounded-pill ${status === "matched" ? "bg-brand-deep" : "bg-brand-blue"}`}
        />
        {statusText}
      </p>

      {status === "recruiting" && count > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-label flex items-center justify-between text-text-primary">
            <span>{item.shortBy > 0 ? `差 ${item.shortBy} 人開課` : "已達開課人數"}</span>
            <span className="text-text-secondary">
              {count} / {course.max_participants} 人
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="報名進度"
            aria-valuemin={0}
            aria-valuemax={course.max_participants}
            aria-valuenow={count}
            className="h-2 overflow-hidden rounded-pill bg-tint-blue-200"
          >
            <div className="h-full rounded-pill bg-brand-blue" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <p className="text-body-small rounded-md bg-brand-light px-3 py-2.5 text-text-secondary">{item.hint}</p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {count > 0 ? (
          <>
            <Link href={manageHref} className={buttonClassName("primary")}>
              查看名單
            </Link>
            <Link
              href={`/coach/sessions/${session.id}/announcements`}
              className={buttonClassName("secondary")}
            >
              發送公告
            </Link>
            {status === "recruiting" && (
              <Link href={`${manageHref}/edit`} className={buttonClassName("ghost")}>
                編輯公告與 QA
              </Link>
            )}
          </>
        ) : (
          <>
            <Link href={`${manageHref}/edit`} className={buttonClassName("primary")}>
              編輯課程
            </Link>
            <Link href={`/coach/courses/new?from=${course.id}`} className={buttonClassName("secondary")}>
              複製課程
            </Link>
          </>
        )}
        {item.canCancel && (
          // 取消場次的確認與實際動作在課程管理頁（1.0），這裡只帶過去
          <Link href={manageHref} className={buttonClassName("ghost")}>
            取消場次
          </Link>
        )}
      </div>
    </article>
  );
}
