import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegistrationState } from "@/app/registrations/_lib/registration-rules";
import CourseQa from "@/components/course/CourseQa";
import ShareButton from "@/components/share/ShareButton";
import CourseStatusNotice from "@/components/course/CourseStatusNotice";
import SessionRegisterButton from "@/components/course/SessionRegisterButton";
import { getCourseAvailability } from "@/lib/course-status/getCourseAvailability";
import { getCourseDetail } from "@/lib/courses/getCourseDetail";
import { getCourseViewer } from "@/lib/courses/queries";
import { LEVEL_LABELS } from "@/lib/courses/types";

// 台灣時區；日期與時間分開組字串，避免 Node 與瀏覽器的 Intl 空白不同
function formatSession(startIso: string, endIso: string) {
  const date = new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(startIso));
  const time = (iso: string) =>
    new Intl.DateTimeFormat("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Taipei",
    }).format(new Date(iso));
  return `${date} ${time(startIso)}–${time(endIso)}`;
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const { session: sessionParam } = await searchParams;
  const course = await getCourseDetail(id);
  if (!course) notFound();

  const now = new Date();
  // 一張卡＝一個場次（2026-10-05 決定）：詳情頁只顯示 ?session= 指定的場次。
  // 指定的場次即使已開始或取消也照樣顯示狀態（舊連結仍可開啟）；
  // 沒帶或帶了不存在的 id（舊連結、亂打）就退回最近一個還沒開始的場次，都沒有就顯示最後一個。
  const requested =
    typeof sessionParam === "string"
      ? course.sessions.find((s) => s.id === sessionParam)
      : undefined;
  const upcoming = course.sessions.find((s) => new Date(s.startsAt) > now);
  const chosen = requested ?? upcoming ?? course.sessions[course.sessions.length - 1];
  const availability = getCourseAvailability(
    {
      status: chosen.status === "cancelled" ? "cancelled" : course.status,
      end_time: chosen.endsAt,
      max_participants: course.capacity,
    },
    chosen.enrolled,
    now,
  );
  const viewer = await getCourseViewer([chosen.id]);
  const left =
    chosen.enrolled >= course.minToOpen
      ? "✅ 已達開課人數"
      : `🔥 差 ${course.minToOpen - chosen.enrolled} 人開課`;
  // 按鈕狀態用 Ted 的 getRegistrationState（#36）：自己的課、已報名、截止、額滿、未登入
  const state = getRegistrationState({
    session: {
      status: chosen.rawStatus,
      registration_deadline_at: chosen.registrationDeadlineAt,
      end_at: chosen.endsAt,
    },
    course: {
      coach_id: course.coachId,
      min_participants: course.minToOpen,
      max_participants: course.capacity,
    },
    enrolledCount: chosen.enrolled,
    viewer:
      viewer.kind === "guest"
        ? { kind: "guest" }
        : {
            kind: "user",
            userId: viewer.userId,
            hasActiveRegistration: viewer.registeredSessionIds.has(chosen.id),
          },
    now,
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 text-slate-800">
      <Link href="/courses" className="text-sm text-slate-500 hover:underline">
        ← 回課程列表
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="rounded-full bg-slate-100 px-3 py-1">{course.sport}</span>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-white">
            {LEVEL_LABELS[course.level]}
          </span>
        </div>
        <h1 className="text-2xl font-black text-slate-900">{course.title}</h1>
        <p className="text-sm text-slate-600">
          教練：
          <Link
            href={`/coaches/${course.coachId}`}
            className="font-semibold text-slate-800 hover:underline"
          >
            {course.coachName}
          </Link>
        </p>
        <ShareButton
          path={`/courses/${course.courseId}?session=${chosen.id}`}
          title={course.title}
        />
      </header>

      <CourseStatusNotice
        availability={availability}
        coachProfileHref={`/coaches/${course.coachId}`}
      />

      <section className="space-y-2 rounded-2xl border border-slate-100 p-5">
        <h2 className="font-bold">課程資訊</h2>
        <p className="text-sm">📍 {course.address}</p>
        <p className="text-sm">
          💰 NT$ {course.price.toLocaleString()} / 人
        </p>
        <p className="text-sm">
          👥 滿 {course.minToOpen} 人開課，最多 {course.capacity} 人
        </p>
        <p className="whitespace-pre-line pt-2 text-sm text-slate-600">
          {course.description}
        </p>
        {course.notes && (
          <p className="text-sm text-slate-500">注意事項：{course.notes}</p>
        )}
      </section>

      <CourseQa items={course.qa} />

      <section className="space-y-3">
        <h2 className="font-bold">場次</h2>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4">
          <div className="space-y-1 text-sm">
            <p className="font-semibold">{formatSession(chosen.startsAt, chosen.endsAt)}</p>
            <p className="text-xs text-slate-500">
              {chosen.enrolled}/{course.capacity} 人・{left}
            </p>
          </div>
          <SessionRegisterButton
            state={state}
            courseId={course.courseId}
            sessionId={chosen.id}
          />
        </div>
      </section>
    </main>
  );
}
