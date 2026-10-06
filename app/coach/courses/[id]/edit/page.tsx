import { notFound, redirect } from "next/navigation";
import { updateCourse } from "@/app/courses/actions";
import { CourseForm } from "@/app/courses/_components/course-form";
import { NotCoachNotice, PageShell } from "@/app/courses/_components/page-shell";
import { courseRowToFormValues, serializeSlots } from "@/app/courses/_lib/course-input";
import { sessionsToSlots } from "@/app/courses/_lib/slot-sync";
import { getCoachContext, getMyCourse, isCourseEditLocked, listDistricts } from "@/app/courses/_lib/queries";

/**
 * 編輯課程／範本（PRD 1.0 規格4、系統規則「教練課程上架管理」）。
 * 任一場次有有效報名 → 鎖定模式（PRD v4.8）：課程共用資料鎖定，只能改課程須知、QA、封面圖與沒有人報名的場次時間；server action 也會用同樣的條件再擋一次。
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

  // 已有人報名：時間表改由場次組出來，每一堂帶著場次 id 與是否鎖定（有人報名的那一堂時間不能改、不能刪除）
  const locked = isCourseEditLocked(course);
  const initialValues = courseRowToFormValues(course);
  if (locked) {
    initialValues.session_slots = serializeSlots(
      sessionsToSlots(
        course.sessions.map((sess) => ({
          id: sess.id,
          status: sess.status,
          start_at: sess.start_at,
          end_at: sess.end_at,
          registrationCount: sess.roster.length,
        })),
        course.session_date
      )
    );
  }

  return (
    <PageShell
      title={course.is_template ? "編輯範本" : "編輯課程"}
      description={course.title}
      back={{ href: `/coach/courses/${course.id}`, label: "課程管理" }}
    >
      <CourseForm
        action={updateCourse}
        initialValues={initialValues}
        districts={await listDistricts(ctx.supabase)}
        mode="edit"
        courseId={course.id}
        isTemplate={course.is_template}
        initialTemplateName={course.template_name ?? ""}
        locked={locked}
      />
    </PageShell>
  );
}
