/* eslint-disable @next/next/no-img-element -- 封面圖可能是 Supabase Storage 網址，原因同 cover-picker.tsx */

import Link from "next/link";
import { redirect } from "next/navigation";
import { NotCoachNotice } from "@/app/courses/_components/page-shell";
import { buttonClassName } from "@/components/ui/button";
import { CoachLocalNav } from "@/components/coach/coach-local-nav";
import { CoachCourseCard, type CardSession } from "./_components/course-card";
import { resolveCoverUrl } from "@/app/courses/_lib/cover-image";
import { COURSE_LEVELS, slotsFromCourse } from "@/app/courses/_lib/course-input";
import { formatPrice } from "@/app/courses/_lib/format";
import { getCoachContext, listDistricts, listMyCourses, listMyTemplates } from "@/app/courses/_lib/queries";
import { SESSION_DISPLAY_LABELS, sessionDisplayStatus, type SessionDisplayStatus } from "@/app/courses/_lib/session-rules";
import type { Course } from "@/types/database";

// PRD 1.0 規格4：教練的「課程管理」（原稱「我的課程」，與學員的「我的課程」重名，改名）依狀態（招生中／確定開課／已結束／已取消）列出各場次；
// 另加「全部」頁籤（鯨魚 QA）與「範本」分頁（規格3）。「報名已截止、尚未開課確認」的場次留在招生中，
// 開課確認每 5 分鐘執行一次，這段空窗很短，不另外分類。
const SESSION_TABS: SessionDisplayStatus[] = ["recruiting", "matched", "ended", "cancelled"];
type View = SessionDisplayStatus | "all" | "templates";
const VIEWS: View[] = ["all", ...SESSION_TABS, "templates"];

function parseView(raw: string | string[] | undefined): View {
  return VIEWS.includes(raw as View) ? (raw as View) : "recruiting";
}

// 「全部」分頁裡，一門課的卡片狀態取最優先的場次狀態
const CARD_STATUS_PRIORITY: SessionDisplayStatus[] = ["recruiting", "matched", "ended", "cancelled"];

const levelLabel = (level: Course["level"]) => COURSE_LEVELS.find((l) => l.value === level)?.label ?? level;

export default async function MyCoursesPage({ searchParams }: PageProps<"/coach/courses">) {
  const view = parseView((await searchParams).view);

  const ctx = await getCoachContext();
  if (!ctx.ok && ctx.reason === "unauthenticated") {
    redirect(`/login?redirect=${encodeURIComponent("/coach/courses")}`);
  }
  if (!ctx.ok) {
    return (
      <main className="flex flex-1 flex-col gap-6 px-[var(--spacing-screen-padding)] pb-20 pt-6 md:pt-8">
        <CoachLocalNav active="courses" ctaDisabled />
        <NotCoachNotice />
      </main>
    );
  }

  const [courses, templates, districts] = await Promise.all([
    listMyCourses(ctx),
    listMyTemplates(ctx),
    listDistricts(ctx.supabase),
  ]);
  const regionById = new Map(districts.map((d) => [d.id, `${d.city}${d.district}`]));
  const now = new Date();

  // 一張卡片＝一門課程；課程下的場次依「目前分頁」篩選（全部＝所有場次）
  const cards = courses
    .filter((c) => c.status !== "draft")
    .map((course) => {
      const all: CardSession[] = course.sessions.map((session) => ({ session, status: sessionDisplayStatus(session, now) }));
      const sessions = view === "all" ? all : all.filter((s) => s.status === view);
      // 「全部」分頁的卡片狀態：進行中的優先，其次已結束、已取消
      const cardStatus: SessionDisplayStatus =
        view === "all" || view === "templates"
          ? (CARD_STATUS_PRIORITY.find((st) => sessions.some((s) => s.status === st)) ?? "cancelled")
          : view;
      return { course, sessions, cardStatus };
    })
    .filter((c) => c.sessions.length > 0)
    // 進行中的依開課時間由近到遠；已結束／已取消由新到舊；「全部」進行中的排在前面
    .sort((a, b) => {
      const live = (st: SessionDisplayStatus) => st === "recruiting" || st === "matched";
      if (view === "all" && live(a.cardStatus) !== live(b.cardStatus)) return live(a.cardStatus) ? -1 : 1;
      const cmp = a.sessions[0].session.start_at.localeCompare(b.sessions[0].session.start_at);
      return live(a.cardStatus) ? cmp : -cmp;
    });

  // 設計稿只有四個狀態分頁；「全部」（鯨魚 QA）與「範本」（PRD 規格3）是額外功能，接在後面
  const tabs: { key: View; label: string }[] = [
    ...SESSION_TABS.map((t) => ({ key: t as View, label: SESSION_DISPLAY_LABELS[t] })),
    { key: "all", label: "全部" },
    { key: "templates", label: "範本" },
  ];

  return (
    <main className="flex flex-1 flex-col gap-6 px-[var(--spacing-screen-padding)] pb-20 pt-6 md:pt-8">
      <CoachLocalNav active="courses" />

      <nav className="flex gap-6 overflow-x-auto border-b border-border-default" aria-label="課程狀態">
        {tabs.map((t) => {
          const active = view === t.key;
          return (
            <Link
              key={t.key}
              href={`/coach/courses?view=${t.key}`}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 flex-col gap-2 pt-2 ${active ? "text-button text-text-primary" : "text-body text-text-secondary"}`}
            >
              {t.label}
              <span className={`h-[3px] w-full ${active ? "bg-brand-blue" : ""}`} />
            </Link>
          );
        })}
      </nav>

      {view === "templates" ? (
        <TemplateList templates={templates} />
      ) : cards.length === 0 ? (
        <EmptyState view={view} />
      ) : (
        <ul className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          {cards.map(({ course, sessions, cardStatus }) => (
            <CoachCourseCard
              key={course.id}
              course={course}
              sessions={sessions}
              cardStatus={cardStatus}
              location={course.district_id ? (regionById.get(course.district_id) ?? "") : ""}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

function EmptyState({ view }: { view: View }) {
  const label = view === "all" ? "" : `「${SESSION_DISPLAY_LABELS[view as SessionDisplayStatus]}」`;
  return (
    <div className="rounded-lg border border-dashed border-border-default bg-brand-white p-8 text-center">
      <p className="text-body-small text-text-secondary">目前沒有{label}的場次。</p>
      {(view === "recruiting" || view === "all") && (
        <Link href="/coach/courses/new" className="text-label mt-3 inline-block text-brand-blue hover:underline">
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
      <div className="text-body-small rounded-lg border border-dashed border-border-default bg-brand-white p-8 text-center text-text-secondary">
        還沒有範本。開課時勾選「發布的同時存成範本」，或在課程管理頁按「另存範本」，下次就能一鍵帶入設定。
      </div>
    );
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {templates.map((t) => {
        const slots = slotsFromCourse(t);
        return (
          <li key={t.id} className="flex flex-col overflow-hidden rounded-lg border border-border-default bg-brand-white">
            <img src={resolveCoverUrl(t)} alt="" className="aspect-[2/1] w-full object-cover" />
            <div className="flex flex-1 flex-col gap-1 p-5">
              <p className="text-h3 line-clamp-2 min-h-[3.25rem] text-text-primary">{t.template_name ?? t.title}</p>
              {t.template_name && <p className="text-caption truncate text-text-secondary">課程名稱：{t.title}</p>}
              <p className="text-caption text-text-primary">
                {t.sport_type}
                <span className="ml-3">{levelLabel(t.level)}</span>
              </p>
              <p className="text-caption text-text-secondary">
                {formatPrice(t.price_per_person)}｜{t.min_participants}–{t.max_participants} 人
              </p>
              <p className="text-caption text-text-secondary">
                {slots.length} 堂：{slots.map((sl) => `${sl.start}–${sl.end}`).join("、")}
              </p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <Link href={`/coach/courses/${t.id}`} className={buttonClassName("secondary")}>
                  查看／編輯
                </Link>
                <Link href={`/coach/courses/new?from=${t.id}`} className={buttonClassName("primary")}>
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
