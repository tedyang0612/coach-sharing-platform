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
  // 狀態小圓點：差 1 人用黃綠提醒「快開課」，其他未達標用藍，已達標用深色
  const dotClass = isConfirmed
    ? "bg-(--color-brand-deep)"
    : gap === 1
      ? "bg-(--color-brand-lime)"
      : "bg-(--color-brand-blue)";

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-(--radius-lg) border border-(--color-border-default) bg-(--color-surface-default) text-(--color-text-primary) shadow-(--shadow-sm) transition-shadow duration-300 hover:shadow-(--shadow-md) ${
        isFull ? "opacity-60" : ""
      }`}
    >
      {/* 先用漸層佔位；之後有課程圖片欄位再換成圖片 */}
      <div className="relative h-48 bg-(--color-tint-blue-100)">
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
          <h3 className="text-h3 line-clamp-2 text-(--color-text-primary)">
            {/* 只有標題是連結，整張卡片不是，這樣教練名稱的連結才不會巢狀 */}
            <Link
              href={`/courses/${course.courseId}?session=${course.id}`}
              className="hover:underline"
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
        </div>

        <div className="space-y-3 border-t border-(--color-border-default) pt-3">
          <div className="flex items-center justify-between gap-2 text-body-small text-(--color-text-secondary)">
            <div className="flex min-w-0 items-center gap-2">
              {/* 卡片本身不是連結，所以教練名稱可以直接放連結（連結不能巢狀） */}
              <Link
                href={`/coaches/${course.coachId}`}
                className="truncate font-bold text-(--color-text-primary) hover:underline"
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

          {course.coachTags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {course.coachTags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-(--color-tint-blue-100) px-2 py-0.5 text-caption text-(--color-text-primary)"
                >
                  {tag}
                </li>
              ))}
              {course.coachTags.length > MAX_VISIBLE_TAGS && (
                <li className="rounded-full bg-(--color-tint-blue-100) px-2 py-0.5 text-caption text-(--color-text-secondary)">
                  +{course.coachTags.length - MAX_VISIBLE_TAGS}
                </li>
              )}
            </ul>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-h3 text-(--color-text-primary)">
              NT$ {course.price.toLocaleString()}
              <span className="text-body-small text-(--color-text-secondary)"> / 人</span>
            </span>
            {/* 列表卡片不放報名按鈕（QA／UI 決定），報名在課程詳情頁選場次；人數進度也只在詳情頁（設計稿 S04 沒有） */}
            {isFull ? (
              <span className="text-xs font-bold text-(--color-text-secondary)">已額滿</span>
            ) : (
              <span className="flex items-center gap-1.5 text-body-small text-(--color-text-primary)">
                <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                {isConfirmed ? "已達開課人數" : `差 ${gap} 人開課`}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
