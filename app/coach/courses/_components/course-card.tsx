/* eslint-disable @next/next/no-img-element -- 封面圖可能是 Supabase Storage 網址，原因同 cover-picker.tsx */

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { resolveCoverUrl } from "@/app/courses/_lib/cover-image";
import { COURSE_LEVELS } from "@/app/courses/_lib/course-input";
import { formatPrice, formatTimeRange } from "@/app/courses/_lib/format";
import { SESSION_DISPLAY_LABELS, type SessionDisplayStatus } from "@/app/courses/_lib/session-rules";
import type { CourseWithSessions, SessionWithRoster } from "@/app/courses/_lib/queries";

// 1013 設計稿 C03（桌機 662:5075／手機 662:6558）：一張卡片＝一門課程。
// 上半是封面圖＋課程資訊＋狀態，下半把這門課在目前分頁底下的場次橫向並排（時間、人數、進度條）。

export type CardSession = { session: SessionWithRoster; status: SessionDisplayStatus };

const TZ = "Asia/Taipei";

// 「10/18(六)」：教練端日期格式，星期用單字
function formatCardDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("zh-TW", { timeZone: TZ, month: "numeric", day: "numeric", weekday: "short" }).formatToParts(
    new Date(iso)
  );
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")}/${get("day")}(${get("weekday").replace("週", "")})`;
}

// 場次時間範圍用空格連字號（設計稿「09:00 - 10:00」）
const timeRange = (start: string, end: string) => formatTimeRange(start, end).replace("–", " - ");

const levelLabel = (level: CourseWithSessions["level"]) => COURSE_LEVELS.find((l) => l.value === level)?.label ?? level;

// 卡片右上角的狀態點：招生中＝藍、確定開課＝深藍、已結束＝灰實心、已取消＝灰空心
const STATUS_DOT: Record<SessionDisplayStatus, string> = {
  recruiting: "bg-brand-blue",
  matched: "bg-brand-deep",
  ended: "bg-state-disabled-text",
  cancelled: "border border-state-disabled-text",
};

function sessionNote(status: SessionDisplayStatus, enrolled: number, min: number, max: number): string {
  if (status === "ended") return "已結束";
  if (status === "cancelled") return "已取消";
  if (enrolled >= max) return "已額滿";
  if (enrolled >= min) return "已達開課人數";
  return `再 ${min - enrolled} 人可開課`;
}

function SessionCell({ session, status, course }: CardSession & { course: CourseWithSessions }) {
  const live = status === "recruiting" || status === "matched";
  const reached = session.active_count >= course.min_participants;
  const percent = Math.min(100, Math.round((session.active_count / Math.max(1, course.min_participants)) * 100));
  const bar = !live ? "bg-state-disabled-text" : reached ? "bg-brand-deep" : "bg-brand-blue";
  const dot = !live ? "bg-state-disabled-text" : reached ? "bg-brand-deep" : "bg-brand-blue";

  return (
    <li className="flex min-w-[168px] flex-1 flex-col gap-1 border-l border-border-default pl-4 first:border-l-0 first:pl-0 shrink-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-label whitespace-nowrap font-[family-name:var(--font-latin)] text-text-primary">
          {timeRange(session.start_at, session.end_at)}
        </span>
        <span className="text-caption whitespace-nowrap text-text-secondary">
          <span className="font-[family-name:var(--font-latin)]">
            {session.active_count} / {course.max_participants}
          </span>{" "}
          人
        </span>
      </div>
      <span aria-hidden="true" className="relative h-[3px] w-full max-w-[96px] rounded-pill bg-border-default">
        <span className={`absolute inset-y-0 left-0 rounded-pill ${bar}`} style={{ width: live ? `${percent}%` : "100%" }} />
      </span>
      <span className="text-caption flex items-center gap-1.5 text-text-secondary">
        <span aria-hidden="true" className={`size-1.5 rounded-pill ${dot}`} />
        {sessionNote(status, session.active_count, course.min_participants, course.max_participants)}
      </span>
    </li>
  );
}

export function CoachCourseCard({
  course,
  sessions,
  cardStatus,
  location,
}: {
  course: CourseWithSessions;
  sessions: CardSession[];
  cardStatus: SessionDisplayStatus;
  /** 「台北市大安區」，由 districts 表反查；沒有行政區的舊資料為空字串 */
  location: string;
}) {
  const first = sessions[0].session;
  const lastEnd = sessions.reduce((latest, s) => (s.session.end_at > latest ? s.session.end_at : latest), first.end_at);

  return (
    <li className="flex min-w-0 flex-col gap-4 rounded-lg border border-border-default bg-brand-white p-5">
      <Link href={`/coach/courses/${course.id}`} className="flex flex-col gap-4 md:flex-row md:items-start">
        <img
          src={resolveCoverUrl(course)}
          alt=""
          className="aspect-video w-full shrink-0 rounded-md object-cover md:aspect-auto md:h-[100px] md:w-[178px]"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption text-text-primary">
              {course.sport_type}
              <span className="ml-3">{levelLabel(course.level)}</span>
            </p>
            <span className="text-caption flex shrink-0 items-center gap-1.5 text-text-secondary">
              <span aria-hidden="true" className={`size-2 rounded-pill ${STATUS_DOT[cardStatus]}`} />
              {SESSION_DISPLAY_LABELS[cardStatus]}
            </span>
          </div>
          <h2 className="text-h3 line-clamp-2 text-text-primary">{course.title}</h2>
          <p className="text-caption text-text-secondary">
            <span className="font-[family-name:var(--font-latin)]">
              {formatCardDate(first.start_at)} {timeRange(first.start_at, lastEnd)}
            </span>
          </p>
          <p className="text-caption truncate text-text-secondary">
            {[location, course.location_name].filter(Boolean).join(" ")}
          </p>
          <p className="text-label font-[family-name:var(--font-latin)] text-text-primary">{formatPrice(course.price_per_person)}</p>
        </div>
      </Link>

      <div className="flex items-center gap-2 border-t border-border-default pt-4">
        <ul className="flex min-w-0 flex-1 gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="場次">
          {sessions.map((s) => (
            <SessionCell key={s.session.id} {...s} course={course} />
          ))}
        </ul>
        {sessions.length > 3 && <Icon name="arrow-right" className="size-5 text-text-primary" />}
      </div>

      {/* 列表上直接給編輯與複製，不用先點進課程頁（鯨魚 QA）；已取消的課程不能編輯 */}
      <div className="flex justify-end gap-1 border-t border-border-default pt-2">
        {course.status !== "cancelled" && (
          <Link
            href={`/coach/courses/${course.id}/edit`}
            className="text-label rounded-pill px-3 py-1.5 text-text-primary transition hover:bg-tint-blue-100"
          >
            編輯
          </Link>
        )}
        <Link
          href={`/coach/courses/new?from=${course.id}`}
          className="text-label rounded-pill px-3 py-1.5 text-brand-blue transition hover:bg-tint-blue-100"
        >
          複製課程
        </Link>
      </div>
    </li>
  );
}
