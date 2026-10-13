import Link from "next/link";
import { CalendarIcon, MapPinIcon, StarIcon } from "@/components/goland/icons";
import { LEVEL_LABELS, type Course } from "@/lib/courses/types";

// 例如「10/10（六） 19:00–20:00」；日期與時間分開組字串，避免 Node 與瀏覽器的 Intl 空白不同
function formatSchedule(startIso: string, endIso: string) {
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

// 「已認證」只留圖示（UI 討論結論）。這是暫時的圖示；
// 牛牛的 <VerifiedBadge />（PR #11）合併後換成那個元件。
function VerifiedIcon() {
  return (
    <span title="認證教練" className="inline-flex shrink-0">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
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
  );
}

const MAX_VISIBLE_TAGS = 3;

interface Props {
  course: Course;
}

export default function CourseCard({ course }: Props) {
  const isConfirmed = course.enrolled >= course.minToOpen;
  const isFull = course.enrolled >= course.capacity;
  const gap = course.minToOpen - course.enrolled;
  // 狀態小圓點（設計師 10/13）：差 1 人螢光綠 12px、差 N 人天空藍 8px；已達標與額滿都是深藍 8px
  const dotClass = isFull || isConfirmed
    ? "h-2 w-2 bg-(--color-brand-deep)"
    : gap === 1
      ? "h-3 w-3 bg-(--color-brand-lime)"
      : "h-2 w-2 bg-(--color-brand-blue)";

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-(--radius-lg) border border-(--color-border-default) bg-(--color-surface-default) text-(--color-text-primary) shadow-(--shadow-sm) transition-shadow duration-300 hover:shadow-(--shadow-md) ${
        isFull ? "opacity-60" : ""
      }`}
    >
      {/* 封面可能是站內圖庫（svg）或 Supabase bucket 的網址，用一般 img，不需要設定 next/image 的來源網域；
          圖還沒載入時露出淡藍底 */}
      <div className="relative h-48 bg-(--color-tint-blue-100)">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={course.coverUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded-full bg-(--color-surface-default) px-3 py-1 text-caption text-(--color-text-primary)">
            {course.sport}
          </span>
          <span className="rounded-full bg-(--color-surface-default) px-3 py-1 text-caption text-(--color-text-primary)">
            {LEVEL_LABELS[course.level]}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-4 p-5">
        <div>
          {/* 標題固定兩行高（26px × 2），一行或兩行的卡片高度一致（S04 回饋） */}
          <h3 className="text-h3 line-clamp-2 h-[52px] text-(--color-text-primary)">
            {/* 整張卡片可以點：標題連結用 after 偽元素鋪滿整張卡片（stretched link），
                卡片本身不包 <a>，教練名稱的連結才不會巢狀；教練名稱用 relative z-10 浮在上面，仍可單獨點 */}
            <Link
              href={`/courses/${course.courseId}?session=${course.id}`}
              className="after:absolute after:inset-0 after:content-[''] group-hover:underline"
            >
              {course.title}
            </Link>
          </h3>
          <p className="mt-2 flex items-center gap-1.5 text-body-small text-(--color-text-secondary)">
            <CalendarIcon size={14} />
            <span>{formatSchedule(course.startsAt, course.endsAt)}</span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-body-small text-(--color-text-secondary)">
            <MapPinIcon size={14} />
            <span>
              {course.city}{course.district} {course.venue}
            </span>
          </p>
          {/* 設計稿 S04（第六頁）：教練列在地點下面、分隔線上面，名稱與星級靠在一起 */}
          <div className="mt-1 flex items-center gap-2 text-body-small text-(--color-text-secondary)">
            <div className="flex min-w-0 items-center gap-2">
              {/* 浮在整張卡片的連結上面（relative z-10），點教練名稱去教練頁，不會進課程詳情 */}
              <Link
                href={`/coaches/${course.coachId}`}
                className="relative z-10 truncate font-bold text-(--color-text-primary) hover:underline"
              >
                {course.coachName}
              </Link>
              {course.coachVerified && <VerifiedIcon />}
            </div>
            <span className="flex shrink-0 items-center gap-1">
              {course.coachRating !== null ? (
                <>
                  <StarIcon size={14} />
                  <span className="font-bold text-(--color-text-primary)">
                    {/* 資料庫的 avg_rating 已四捨五入到小數一位，直接顯示才會和教練檔案一致 */}
                    {course.coachRating.toFixed(1)}
                  </span>
                  <span className="text-(--color-text-secondary)">
                    ({course.coachReviewCount})
                  </span>
                </>
              ) : (
                <span className="text-(--color-text-secondary)">尚無評價</span>
              )}
            </span>
          </div>
          {/* 設計稿 S04（10/13 設計師回覆）：教練列下面一行特色 Tag，如「適合新手」 */}
          {course.coachTags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {course.coachTags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-(--color-border-default) bg-(--color-surface-default) px-2 py-0.5 text-caption text-(--color-text-secondary)"
                >
                  {tag}
                </li>
              ))}
              {course.coachTags.length > MAX_VISIBLE_TAGS && (
                <li className="rounded-full border border-(--color-border-default) bg-(--color-surface-default) px-2 py-0.5 text-caption text-(--color-text-secondary)">
                  +{course.coachTags.length - MAX_VISIBLE_TAGS}
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="border-t border-(--color-border-default) pt-3">
          <div className="flex items-center justify-between">
            <span className="text-h3 text-(--color-text-primary)">
              NT${course.price.toLocaleString()}
            </span>
            {/* 文案（設計師 10/13）：差 1 人開課・3/6 人；已達開課人數・4/6 人；已額滿・6/6 人；人數用次要色 */}
            <span className="flex items-center gap-1.5 text-body-small text-(--color-text-primary)">
              <span className={`rounded-full ${dotClass}`} />
              {isFull ? "已額滿" : isConfirmed ? "已達開課人數" : `差 ${gap} 人開課`}
              <span className="text-(--color-text-secondary)">
                {course.enrolled}/{course.capacity} 人
              </span>
            </span>
          </div>
          {/* 「報名」進課程詳情頁（一張卡＝一個場次，健康聲明與立即報名在詳情頁）；
              浮在整張卡片的連結上面（relative z-10）。額滿是不可點的灰色按鈕 */}
          {isFull ? (
            <span className="text-button mt-3 flex items-center justify-center rounded-full bg-(--color-state-disabled-bg) px-5 py-2.5 text-(--color-state-disabled-text)">
              已額滿
            </span>
          ) : (
            <Link
              href={`/courses/${course.courseId}?session=${course.id}`}
              className="text-button relative z-10 mt-3 flex items-center justify-center rounded-full bg-(--color-brand-blue) px-5 py-2.5 text-(--color-text-inverse) hover:bg-(--color-brand-blue-pressed)"
            >
              報名
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
