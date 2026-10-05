/* eslint-disable @next/next/no-img-element -- 封面圖可能是 Supabase Storage 網址，原因同 cover-picker.tsx */

import Link from "next/link";
import { redirect } from "next/navigation";
import { NotCoachNotice, PageShell } from "@/app/courses/_components/page-shell";
import { SessionStatusBadge } from "@/app/courses/_components/status-badge";
import { resolveCoverUrl } from "@/app/courses/_lib/cover-image";
import { COURSE_LEVELS, slotsFromCourse } from "@/app/courses/_lib/course-input";
import { formatPrice, formatSessionTime } from "@/app/courses/_lib/format";
import { getCoachContext, listMyCourses, listMyTemplates } from "@/app/courses/_lib/queries";
import { SESSION_DISPLAY_LABELS, sessionDisplayStatus, type SessionDisplayStatus } from "@/app/courses/_lib/session-rules";
import type { Course } from "@/types/database";

// PRD 1.0 規格4：「我的課程」依狀態（招生中／確定開課／已結束／已取消）列出各場次；
// 另加「全部」頁籤（鯨魚 QA）與「範本」分頁（規格3）。「報名已截止、尚未開課確認」的場次留在招生中，
// 開課確認每 5 分鐘執行一次，這段空窗很短，不另外分類。
const SESSION_TABS: SessionDisplayStatus[] = ["recruiting", "matched", "ended", "cancelled"];
type View = SessionDisplayStatus | "all" | "templates";
const VIEWS: View[] = ["all", ...SESSION_TABS, "templates"];

function parseView(raw: string | string[] | undefined): View {
  return VIEWS.includes(raw as View) ? (raw as View) : "recruiting";
}

const levelLabel = (level: Course["level"]) => COURSE_LEVELS.find((l) => l.value === level)?.label ?? level;

export default async function MyCoursesPage({ searchParams }: PageProps<"/coach/courses">) {
  const view = parseView((await searchParams).view);

  const ctx = await getCoachContext();
  if (!ctx.ok && ctx.reason === "unauthenticated") {
    redirect(`/login?redirect=${encodeURIComponent("/coach/courses")}`);
  }
  if (!ctx.ok) {
    return (
      <PageShell title="我的課程">
        <NotCoachNotice />
      </PageShell>
    );
  }

  const [courses, templates] = await Promise.all([listMyCourses(ctx), listMyTemplates(ctx)]);
  const now = new Date();

  // 攤平成「場次」列表，每列帶著所屬課程
  const rows = courses
    .filter((c) => c.status !== "draft")
    .flatMap((course) => course.sessions.map((session) => ({ course, session, status: sessionDisplayStatus(session, now) })));

  const counts = Object.fromEntries(SESSION_TABS.map((t) => [t, rows.filter((r) => r.status === t).length])) as Record<
    SessionDisplayStatus,
    number
  >;

  // 進行中的依開課時間由近到遠；已結束／已取消由新到舊；「全部」進行中的排在前面
  const isLive = (s: SessionDisplayStatus) => s === "recruiting" || s === "matched";
  const visible = rows
    .filter((r) => view === "all" || r.status === view)
    .sort((a, b) => {
      if (view === "all" && isLive(a.status) !== isLive(b.status)) return isLive(a.status) ? -1 : 1;
      const live = view === "all" ? isLive(a.status) : view === "recruiting" || view === "matched";
      return live ? a.session.start_at.localeCompare(b.session.start_at) : b.session.start_at.localeCompare(a.session.start_at);
    });

  const tabs: { key: View; label: string; count: number }[] = [
    { key: "all", label: "全部", count: rows.length },
    ...SESSION_TABS.map((t) => ({ key: t as View, label: SESSION_DISPLAY_LABELS[t], count: counts[t] })),
    { key: "templates", label: "範本", count: templates.length },
  ];

  return (
    <PageShell title="我的課程" description="依場次狀態查看報名人數與學員名單；點場次進入課程管理。">
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1" aria-label="課程狀態">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/coach/courses?view=${t.key}`}
            aria-current={view === t.key ? "page" : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              view === t.key ? "bg-brand text-white" : "bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-xs ${view === t.key ? "text-white/80" : "text-neutral-400"}`}>{t.count}</span>
          </Link>
        ))}
      </nav>

      {view === "templates" ? (
        <TemplateList templates={templates} />
      ) : visible.length === 0 ? (
        <EmptyState view={view} />
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map(({ course, session, status }) => (
            <li
              key={session.id}
              className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm transition hover:border-brand"
            >
              <Link href={`/coach/courses/${course.id}`} className="flex items-center gap-4">
                <img src={resolveCoverUrl(course)} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-neutral-900">{course.title}</p>
                  <p className="text-xs font-semibold text-brand">
                    {course.sport_type}｜{levelLabel(course.level)}
                  </p>
                  <p className="text-sm text-neutral-600">{formatSessionTime(session.start_at, session.end_at)}</p>
                  <p className="text-xs text-neutral-500">
                    已報名 {session.active_count}／{course.max_participants} 人（下限 {course.min_participants}）｜
                    {course.location_name}
                  </p>
                </div>
                <SessionStatusBadge status={status} />
              </Link>
              {/* 列表上直接給編輯與複製，不用先點進課程頁（鯨魚 QA）；已取消的課程不能編輯 */}
              <div className="mt-2 flex justify-end gap-2 border-t border-neutral-100 pt-2">
                {course.status !== "cancelled" && (
                  <Link
                    href={`/coach/courses/${course.id}/edit`}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                  >
                    編輯
                  </Link>
                )}
                <Link
                  href={`/coach/courses/new?from=${course.id}`}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand-ink"
                >
                  複製課程
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

function EmptyState({ view }: { view: View }) {
  const label = view === "all" ? "" : `「${SESSION_DISPLAY_LABELS[view as SessionDisplayStatus]}」`;
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
      <p className="text-sm text-neutral-500">目前沒有{label}的場次。</p>
      {(view === "recruiting" || view === "all") && (
        <Link href="/coach/courses/new" className="mt-3 inline-block text-sm font-bold text-brand hover:underline">
          建立第一堂課 →
        </Link>
      )}
    </div>
  );
}

// 範本卡片：版面比照課程卡片（封面圖、運動與程度、價格人數），再加上場次時段；
// 名稱最多 2 行並保留固定高度，按鈕貼底，內容多寡不會讓按鈕位置跑掉（鯨魚 QA）
function TemplateList({ templates }: { templates: Course[] }) {
  if (templates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
        還沒有範本。開課時勾選「發布的同時存成範本」，或在課程管理頁按「另存範本」，下次就能一鍵帶入設定。
      </div>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {templates.map((t) => {
        const slots = slotsFromCourse(t);
        return (
          <li key={t.id} className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <img src={resolveCoverUrl(t)} alt="" className="aspect-[2/1] w-full object-cover" />
            <div className="flex flex-1 flex-col gap-1 p-4">
              <p className="line-clamp-2 min-h-[3rem] font-semibold leading-6 text-neutral-900">{t.template_name ?? t.title}</p>
              {t.template_name && <p className="truncate text-xs text-neutral-500">課程名稱：{t.title}</p>}
              <p className="text-xs font-semibold text-brand">
                {t.sport_type}｜{levelLabel(t.level)}
              </p>
              <p className="text-xs text-neutral-500">
                {formatPrice(t.price_per_person)}／人｜{t.min_participants}–{t.max_participants} 人
              </p>
              <p className="text-xs text-neutral-500">
                {slots.length} 堂：{slots.map((sl) => `${sl.start}–${sl.end}`).join("、")}
              </p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <Link
                  href={`/coach/courses/${t.id}`}
                  className="rounded-xl border border-neutral-200 px-3.5 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  查看／編輯
                </Link>
                <Link
                  href={`/coach/courses/new?from=${t.id}`}
                  className="rounded-xl bg-brand px-3.5 py-2 text-sm font-bold text-white hover:opacity-90"
                >
                  套用範本開課
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
