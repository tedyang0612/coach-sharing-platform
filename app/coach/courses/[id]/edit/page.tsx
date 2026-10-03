import { notFound, redirect } from "next/navigation";
import { updateCourse } from "@/app/courses/actions";
import { CourseForm } from "@/app/courses/_components/course-form";
import { NotCoachNotice, PageShell } from "@/app/courses/_components/page-shell";
import { courseRowToFormValues } from "@/app/courses/_lib/course-input";
import { getCoachContext, getMyCourse, isCourseEditLocked } from "@/app/courses/_lib/queries";

/**
 * 編輯課程／範本（PRD 1.0 規格4、系統規則「教練課程上架管理」）。
 * 任一場次有有效報名 → 鎖定模式：只能改課程須知與封面圖；server action 也會用同樣的條件再擋一次。
 */
export default async function EditCoursePage({ params }: PageProps<"/coach/courses/[id]/edit">) {
  const { id } = await params;

  const ctx = await getCoachContext();
  if (!ctx.ok && ctx.reason === "unauthenticated") {
    redirect(`/login?redirect=${encodeURIComponent(`/coach/courses/${id}/edit`)}`);
  }
  if (!ctx.ok) {
    return (
      <PageShell title="編輯課程">
        <NotCoachNotice />
      </PageShell>
    );
  }

  const course = await getMyCourse(ctx, id);
  if (!course) notFound();
  if (course.status === "cancelled") redirect(`/coach/courses/${course.id}`);

  return (
    <PageShell
      title={course.is_template ? "編輯範本" : "編輯課程"}
      description={course.title}
      back={{ href: `/coach/courses/${course.id}`, label: "課程管理" }}
    >
      <CourseForm
        action={updateCourse}
        initialValues={courseRowToFormValues(course)}
        mode="edit"
        courseId={course.id}
        isTemplate={course.is_template}
        locked={isCourseEditLocked(course)}
      />
    </PageShell>
  );
}
