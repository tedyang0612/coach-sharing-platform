import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegistrationState } from "@/app/registrations/_lib/registration-rules";
import CourseQa from "@/components/course/CourseQa";
import GolandTheme from "@/components/goland/GolandTheme";
import { MapPinIcon, TagIcon, UsersIcon } from "@/components/goland/icons";
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
  const reachedMin = chosen.enrolled >= course.minToOpen;
  const gap = course.minToOpen - chosen.enrolled;
  const left = reachedMin ? "已達開課人數" : `差 ${gap} 人開課`;
  // 狀態小圓點：已達標深色、差 1 人黃綠、其他藍（和列表卡片一致）
  const dotClass = reachedMin
    ? "bg-(--color-brand-deep)"
    : gap === 1
      ? "bg-(--color-brand-lime)"
      : "bg-(--color-brand-blue)";
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
    <GolandTheme>
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
        <Link
          href="/courses"
          className="text-body-small text-(--color-text-secondary) hover:underline"
        >
          ← 回課程列表
        </Link>

        <header className="space-y-3">
          <div className="text-caption flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-(--color-border-default) bg-(--color-surface-default) px-3 py-1">
              {course.sport}
            </span>
            <span className="rounded-full bg-(--color-tint-blue-100) px-3 py-1">
              {LEVEL_LABELS[course.level]}
            </span>
          </div>
          <h1 className="text-h1">{course.title}</h1>
          <p className="text-body-small text-(--color-text-secondary)">
            教練：
            <Link
              href={`/coaches/${course.coachId}`}
              className="font-bold text-(--color-text-primary) hover:underline"
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

        <section className="space-y-2 rounded-(--radius-lg) border border-(--color-border-default) bg-(--color-surface-default) p-5">
          <h2 className="text-h3">課程資訊</h2>
          <p className="text-body flex items-center gap-2">
            <MapPinIcon size={16} />
            {course.address}
          </p>
          <p className="text-body flex items-center gap-2">
            <TagIcon size={16} />
            NT$ {course.price.toLocaleString()} / 人
          </p>
          <p className="text-body flex items-center gap-2">
            <UsersIcon size={16} />
            滿 {course.minToOpen} 人開課，最多 {course.capacity} 人
          </p>
          <p className="text-body whitespace-pre-line pt-2 text-(--color-text-secondary)">
            {course.description}
          </p>
          {course.notes && (
            <p className="text-body-small text-(--color-text-secondary)">
              注意事項：{course.notes}
            </p>
          )}
        </section>

        <CourseQa items={course.qa} />

        <section className="space-y-3">
          <h2 className="text-h3">場次</h2>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-(--radius-lg) border border-(--color-border-default) bg-(--color-surface-default) p-4">
            <div className="space-y-1">
              <p className="text-body font-bold">
                {formatSession(chosen.startsAt, chosen.endsAt)}
              </p>
              <p className="text-body-small flex items-center gap-1.5 text-(--color-text-secondary)">
                {chosen.enrolled}/{course.capacity} 人・
                <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                {left}
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
    </GolandTheme>
  );
}
