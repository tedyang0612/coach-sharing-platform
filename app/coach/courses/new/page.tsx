import { redirect } from "next/navigation";
import { createCourse } from "@/app/courses/actions";
import { CourseForm } from "@/app/courses/_components/course-form";
import { NotCoachNotice, PageShell } from "@/app/courses/_components/page-shell";
import Link from "next/link";
import { courseRowToFormValues, emptyCourseFormValues } from "@/app/courses/_lib/course-input";
import { getCoachContext, getMyCourse, listDistricts, listMyTemplates } from "@/app/courses/_lib/queries";

/**
 * 開課（PRD 1.0）。帶 ?from=<課程或範本 id> 時，從範本／既有課程帶入除日期外的所有欄位（AC2），教練改完日期再發布。
 */
export default async function NewCoursePage({ searchParams }: PageProps<"/coach/courses/new">) {
  const { from } = await searchParams;
  const fromId = typeof from === "string" ? from : undefined;

  const ctx = await getCoachContext();
  if (!ctx.ok && ctx.reason === "unauthenticated") {
    const back = fromId ? `/coach/courses/new?from=${fromId}` : "/coach/courses/new";
    redirect(`/login?redirect=${encodeURIComponent(back)}`);
  }

  const source = ctx.ok && fromId ? await getMyCourse(ctx, fromId) : null;
  const initialValues = source
    ? { ...courseRowToFormValues(source), session_date: "" }
    : emptyCourseFormValues();
  const districts = ctx.ok ? await listDistricts(ctx.supabase) : [];
  // 全新建立時，表單上方列出最近的範本，一鍵帶入（已經是從範本／複製進來時不再顯示）
  const templates = ctx.ok && !fromId ? (await listMyTemplates(ctx)).slice(0, 6) : [];

  return (
    <PageShell
      title={source ? (source.is_template ? "從範本開課" : "複製課程") : "建立課程"}
      description={
        source ? `已帶入「${source.title}」的設定，請選擇新的上課日期後發布。` : "填好必填欄位就能發布，幾分鐘內完成開課。"
      }
      back={{ href: "/coach/courses", label: "我的課程" }}
    >
      {ctx.ok && templates.length > 0 && (
        <section className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900">快速套用範本</h2>
            <Link href="/coach/courses?view=templates" className="text-xs font-bold text-brand hover:underline">
              全部範本 →
            </Link>
          </div>
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {templates.map((t) => (
              <li key={t.id} className="shrink-0">
                <Link
                  href={`/coach/courses/new?from=${t.id}`}
                  className="block max-w-56 truncate rounded-full border border-neutral-200 px-3.5 py-1.5 text-sm font-semibold text-neutral-700 transition hover:border-brand hover:text-brand"
                >
                  {t.template_name ?? t.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ctx.ok ? (
        <CourseForm action={createCourse} initialValues={initialValues} districts={districts} mode="create" sourceId={source?.id} />
      ) : (
        <NotCoachNotice />
      )}
    </PageShell>
  );
}
