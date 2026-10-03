/* eslint-disable @next/next/no-img-element -- 封面圖可能是 Supabase Storage 網址，原因同 cover-picker.tsx */

import Link from "next/link";
import { redirect } from "next/navigation";
import { NotCoachNotice, PageShell } from "@/app/courses/_components/page-shell";
import { SessionStatusBadge } from "@/app/courses/_components/status-badge";
import { resolveCoverUrl } from "@/app/courses/_lib/cover-image";
import { formatPrice, formatSessionTime } from "@/app/courses/_lib/format";
import { getCoachContext, listMyCourses, listMyTemplates } from "@/app/courses/_lib/queries";
import { SESSION_DISPLAY_LABELS, sessionDisplayStatus, type SessionDisplayStatus } from "@/app/courses/_lib/session-rules";

// PRD 1.0 規格4：「我的課程」依狀態（招生中／已成團／已結束／已取消）列出各場次；另加「範本」分頁（規格3）
const SESSION_TABS: SessionDisplayStatus[] = ["recruiting", "matched", "ended", "cancelled"];
type View = SessionDisplayStatus | "templates";

function parseView(raw: string | string[] | undefined): View {
  return raw === "templates" || SESSION_TABS.includes(raw as SessionDisplayStatus) ? (raw as View) : "recruiting";
}

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

  // 進行中的依開課時間由近到遠；已結束／已取消由新到舊
  const visible = rows
    .filter((r) => r.status === view)
    .sort((a, b) =>
      view === "recruiting" || view === "matched"
        ? a.session.start_at.localeCompare(b.session.start_at)
        : b.session.start_at.localeCompare(a.session.start_at)
    );

  const tabs: { key: View; label: string; count: number }[] = [
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
            <li key={session.id}>
              <Link
                href={`/coach/courses/${course.id}`}
                className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm transition hover:border-brand"
              >
                <img src={resolveCoverUrl(course)} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-neutral-900">{course.title}</p>
                  <p className="text-sm text-neutral-600">{formatSessionTime(session.start_at, session.end_at)}</p>
                  <p className="text-xs text-neutral-500">
                    已報名 {session.active_count}／{course.max_participants} 人（下限 {course.min_participants}）｜
                    {course.location_name}
                  </p>
                </div>
                <SessionStatusBadge status={status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

function EmptyState({ view }: { view: SessionDisplayStatus }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
      <p className="text-sm text-neutral-500">目前沒有「{SESSION_DISPLAY_LABELS[view]}」的場次。</p>
      {view === "recruiting" && (
        <Link href="/coach/courses/new" className="mt-3 inline-block text-sm font-bold text-brand hover:underline">
          建立第一堂課 →
        </Link>
      )}
    </div>
  );
}

function TemplateList({ templates }: { templates: Awaited<ReturnType<typeof listMyTemplates>> }) {
  if (templates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
        還沒有範本。開課時按「存成範本」，或在課程管理頁按「另存範本」，下次就能一鍵帶入設定。
      </div>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {templates.map((t) => (
        <li key={t.id} className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <img src={resolveCoverUrl(t)} alt="" className="aspect-[2/1] w-full object-cover" />
          <div className="flex flex-1 flex-col gap-1 p-4">
            <p className="font-semibold text-neutral-900">{t.title}</p>
            <p className="text-xs text-neutral-500">
              {t.sport_type}｜{formatPrice(t.price_per_person)}／人｜{t.min_participants}–{t.max_participants} 人｜
              {t.time_range_start.slice(0, 5)}–{t.time_range_end.slice(0, 5)}
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                href={`/coach/courses/new?from=${t.id}`}
                className="rounded-xl bg-brand px-3.5 py-2 text-sm font-bold text-white hover:opacity-90"
              >
                套用範本開課
              </Link>
              <Link
                href={`/coach/courses/${t.id}`}
                className="rounded-xl border border-neutral-200 px-3.5 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
              >
                查看／編輯
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
