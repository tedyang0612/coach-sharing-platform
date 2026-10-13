import { notFound } from "next/navigation";
import { getRegistrationState } from "@/app/registrations/_lib/registration-rules";
import { AnnouncementHistory } from "@/components/announcements/announcement-history";
import BackToResults from "@/components/course/BackToResults";
import CoachMini from "@/components/course/CoachMini";
import CourseQa from "@/components/course/CourseQa";
import GroupProgress from "@/components/course/GroupProgress";
import KeyInfoStrip from "@/components/course/KeyInfoStrip";
import HealthDeclaration from "@/components/course/HealthDeclaration";
import RefundRule from "@/components/course/RefundRule";
import ShareButton from "@/components/share/ShareButton";
import CourseStatusNotice from "@/components/course/CourseStatusNotice";
import SessionRegisterButton from "@/components/course/SessionRegisterButton";
import StickyBookingBar from "@/components/course/StickyBookingBar";
import { getCourseAvailability } from "@/lib/course-status/getCourseAvailability";
import { getCourseDetail } from "@/lib/courses/getCourseDetail";
import { getCourseViewer, getSessionAnnouncements } from "@/lib/courses/queries";
import { CalendarIcon, MapPinIcon, UserIcon } from "@/components/goland/icons";
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

// 報名截止時間，例如「10/16（四） 19:00」
function formatDeadline(iso: string) {
  const date = new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(iso));
  const time = new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  }).format(new Date(iso));
  return `${date} ${time}`;
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

  // 已報名這個場次的學員才看得到教練發過的公告（PRD v4.9），包含自己報名之前發的；
  // 沒公告就不顯示整個區塊，避免對沒權限讀取的人寫出「還沒有發過公告」。
  const announcements =
    viewer.kind === "user" && viewer.registeredSessionIds.has(chosen.id)
      ? await getSessionAnnouncements(chosen.id)
      : [];

  const dateText = formatSession(chosen.startsAt, chosen.endsAt);
  // 場次已取消時顯示取消原因（「未達人數取消」不再當成一種狀態，而是「已取消」加原因）
  const cancelReason =
    chosen.rawStatus === "cancelled_unmatched"
      ? "未達人數"
      : chosen.rawStatus === "cancelled_by_coach"
        ? "教練取消"
        : chosen.rawStatus === "cancelled"
          ? "平台取消"
          : undefined;

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-6 px-(--spacing-screen-padding) pb-32 pt-4 lg:pb-12 lg:pt-8">
      <BackToResults />

      <CourseStatusNotice
        availability={availability}
        coachProfileHref={`/coaches/${course.coachId}`}
        cancelReason={cancelReason}
      />

      {/* 英雄區（設計稿 S05，10/13）：桌機左邊 16:9 封面、右邊資訊卡；手機封面滿版、下面一張資訊卡 */}
      <section className="lg:flex lg:overflow-hidden lg:rounded-(--radius-lg) lg:border lg:border-(--color-border-default) lg:bg-(--color-surface-default)">
        {/* 封面可能是站內圖庫（svg）或 Supabase bucket 的網址，用一般 img，不需要設定 next/image 的來源網域 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={course.coverUrl}
          alt=""
          className="-mx-(--spacing-screen-padding) aspect-video w-[calc(100%+2*var(--spacing-screen-padding))] max-w-none bg-(--color-tint-blue-100) object-cover lg:mx-0 lg:w-[63%] lg:max-w-full"
        />
        <div className="mt-4 space-y-4 rounded-(--radius-lg) border border-(--color-border-default) bg-(--color-surface-default) p-4 lg:mt-0 lg:flex-1 lg:rounded-none lg:border-0 lg:p-6">
          <div className="text-caption flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-(--color-border-default) bg-(--color-surface-default) px-3 py-1">
              {course.sport}
            </span>
            <span className="rounded-full bg-(--color-tint-blue-100) px-3 py-1">
              {LEVEL_LABELS[course.level]}
            </span>
          </div>
          <h1 className="text-h1">{course.title}</h1>
          <div className="text-body space-y-2 text-(--color-text-primary)">
            <p className="flex items-center gap-2">
              <CalendarIcon size={18} />
              <span>{dateText}</span>
            </p>
            <p className="flex items-center gap-2">
              <MapPinIcon size={18} />
              <span>
                {course.city}
                {course.district} {course.venue}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <UserIcon size={18} />
              <span>{course.coachName}</span>
              {course.coachVerified && (
                <span title="認證教練" className="inline-flex shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="11" className="fill-(--color-brand-blue)" />
                    <path
                      d="m7.5 12.3 3 3 6-6.6"
                      fill="none"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="stroke-white"
                    />
                  </svg>
                  <span className="sr-only">已認證教練</span>
                </span>
              )}
            </p>
          </div>
          <GroupProgress
            enrolled={chosen.enrolled}
            minToOpen={course.minToOpen}
            capacity={course.capacity}
          />
          <p className="flex items-baseline gap-1.5">
            <span className="text-display font-(family-name:--font-latin)! font-medium!">
              NT${course.price.toLocaleString()}
            </span>
          </p>
          {/* 分享圖示＋立即報名並排；手機底部固定列另有一顆報名鈕 */}
          <div className="flex items-center gap-3">
            <ShareButton
              iconOnly
              path={`/courses/${course.courseId}?session=${chosen.id}`}
              title={course.title}
            />
            <div className="min-w-0 flex-1">
              <SessionRegisterButton
                fullWidth
                state={state}
                courseId={course.courseId}
                sessionId={chosen.id}
              />
            </div>
          </div>
        </div>
      </section>

      <KeyInfoStrip
        dateText={dateText}
        deadlineText={formatDeadline(chosen.registrationDeadlineAt)}
        venue={course.venue}
        address={course.address}
        price={course.price}
        minToOpen={course.minToOpen}
        capacity={course.capacity}
      />

      {announcements.length > 0 && <AnnouncementHistory announcements={announcements} title="教練公告" />}

      {/* 介紹與須知各一張白底卡片（設計稿 S05，10/13） */}
      <section className="space-y-3">
        <div className="space-y-2 rounded-(--radius-lg) border border-(--color-border-default) bg-(--color-surface-default) p-5">
          <h2 className="text-h3">課程介紹</h2>
          <p className="text-body whitespace-pre-line text-(--color-text-secondary)">
            {course.description}
          </p>
        </div>
        {course.notes && (
          <div className="space-y-2 rounded-(--radius-lg) border border-(--color-border-default) bg-(--color-surface-default) p-5">
            <h2 className="text-h3">課程須知</h2>
            <p className="text-body whitespace-pre-line text-(--color-text-secondary)">
              {course.notes}
            </p>
          </div>
        )}
      </section>

      <CourseQa items={course.qa} />

      <section>
        <CoachMini
          href={`/coaches/${course.coachId}`}
          name={course.coachName}
          photoUrl={course.coachPhotoUrl}
          verified={course.coachVerified}
          rating={course.coachRating}
          reviewCount={course.coachReviewCount}
          tags={course.coachTags}
        />
      </section>

      <RefundRule />

      <HealthDeclaration />

      {/* 手機：底部固定列（每人價格＋主按鈕）；桌機的在英雄區 */}
      <StickyBookingBar price={course.price}>
        <SessionRegisterButton
          fullWidth
          state={state}
          courseId={course.courseId}
          sessionId={chosen.id}
        />
      </StickyBookingBar>
    </main>
  );
}
