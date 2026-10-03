import { redirect } from "next/navigation";
import { createCourse } from "@/app/courses/actions";
import { CourseForm } from "@/app/courses/_components/course-form";
import { NotCoachNotice, PageShell } from "@/app/courses/_components/page-shell";
import { courseRowToFormValues, emptyCourseFormValues } from "@/app/courses/_lib/course-input";
import { getCoachContext, getMyCourse } from "@/app/courses/_lib/queries";

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

  return (
    <PageShell
      title={source ? (source.is_template ? "從範本開課" : "複製課程") : "建立課程"}
      description={
        source ? `已帶入「${source.title}」的設定，請選擇新的上課日期後發布。` : "填好必填欄位就能發布，幾分鐘內完成開課。"
      }
      back={{ href: "/coach/courses", label: "我的課程" }}
    >
      {ctx.ok ? (
        <CourseForm action={createCourse} initialValues={initialValues} mode="create" sourceId={source?.id} />
      ) : (
        <NotCoachNotice />
      )}
    </PageShell>
  );
}
