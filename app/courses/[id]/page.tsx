import Link from "next/link";
import { notFound } from "next/navigation";
import ShareButton from "@/components/share/ShareButton";
import CourseStatusNotice from "@/components/course/CourseStatusNotice";
import {
  canRegister,
  getCourseAvailability,
} from "@/lib/course-status/getCourseAvailability";
import { getCourseDetail } from "@/lib/courses/getCourseDetail";
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await getCourseDetail(id);
  if (!course) notFound();

  const now = new Date();
  const sessions = course.sessions
    // 已開始的場次不顯示（和列表一致）
    .filter((s) => new Date(s.startsAt) > now)
    .map((s) => ({
    ...s,
    availability: getCourseAvailability(
      {
        status: s.status === "cancelled" ? "cancelled" : course.status,
        end_time: s.endsAt,
        max_participants: course.capacity,
      },
      s.enrolled,
      now,
    ),
  }));
  const bookable = sessions.filter((s) => s.availability !== "ended");
  // 整個課程都沒有可報名場次時，提示用第一個場次的狀態（取消優先於已結束／額滿）
  const courseAvailability = bookable.some((s) => canRegister(s.availability))
    ? "open"
    : (bookable[0] ?? sessions[0]).availability;

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
        <ShareButton path={`/courses/${course.courseId}`} title={course.title} />
      </header>

      <CourseStatusNotice
        availability={courseAvailability}
        coachProfileHref={`/coaches/${course.coachId}`}
      />

      <section className="space-y-2 rounded-2xl border border-slate-100 p-5">
        <h2 className="font-bold">課程資訊</h2>
        <p className="text-sm">📍 {course.address}</p>
        <p className="text-sm">
          💰 固定每人 NT$ {course.price.toLocaleString()}
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

      <section className="space-y-3">
        <h2 className="font-bold">場次</h2>
        <ul className="space-y-3">
          {sessions.map((s) => {
            const left = s.enrolled >= course.minToOpen
              ? "✅ 已達開課人數"
              : `🔥 差 ${course.minToOpen - s.enrolled} 人開課`;
            const actionable = canRegister(s.availability);
            const label = {
              open: "報名",
              full: "已額滿",
              ended: "已結束",
              cancelled: "已取消",
            }[s.availability];
            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4"
              >
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{formatSession(s.startsAt, s.endsAt)}</p>
                  <p className="text-xs text-slate-500">
                    {s.enrolled}/{course.capacity} 人・{left}
                  </p>
                </div>
                {/* TODO: 接 Ted 的 PR #21 getRegistrationState（登入、已報名、截止）；
                    目前只依場次狀態決定能不能按，按了沒有動作 */}
                <button
                  type="button"
                  disabled={!actionable}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
