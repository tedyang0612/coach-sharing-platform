import Link from "next/link";
import { loginHref } from "@/lib/courses/loginHref";
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
        <circle cx="12" cy="12" r="11" className="fill-amber-400" />
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
  loggedIn: boolean;
}

export default function CourseCard({ course, loggedIn }: Props) {
  const isConfirmed = course.enrolled >= course.minToOpen;
  const isFull = course.enrolled >= course.capacity;
  const progressPercent = Math.min(
    100,
    Math.round((course.enrolled / course.capacity) * 100),
  );

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white text-slate-800 transition-all duration-300 hover:border-teal-200 hover:shadow-xl">
      {/* 先用漸層佔位；之後有課程圖片欄位再換成圖片 */}
      <div className="relative h-48 bg-gradient-to-br from-teal-100 to-sky-200">
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-800 shadow-sm backdrop-blur-md">
            {course.sport}
          </span>
          <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-md">
            {LEVEL_LABELS[course.level]}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm ${
              isConfirmed ? "bg-emerald-500" : "bg-orange-500"
            }`}
          >
            {isConfirmed
              ? "✅ 已達開課人數"
              : `🔥 差 ${course.minToOpen - course.enrolled} 人開課`}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-4 p-5">
        <div>
          <h3 className="line-clamp-2 text-base font-bold text-slate-900 transition-colors group-hover:text-teal-700">
            {/* 只有標題是連結，整張卡片不是，這樣教練名稱的連結才不會巢狀 */}
            <Link href={`/courses/${course.courseId}`} className="hover:underline">
              {course.title}
            </Link>
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            📍 {course.city}{course.district} {course.venue}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            📅 {formatSchedule(course.startsAt, course.endsAt)}
          </p>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex min-w-0 items-center gap-2">
              {/* 卡片本身不是連結，所以教練名稱可以直接放連結（連結不能巢狀） */}
              <Link
                href={`/coaches/${course.coachId}`}
                className="truncate font-semibold text-slate-800 hover:underline"
              >
                {course.coachName}
              </Link>
              {course.coachVerified && <VerifiedIcon />}
            </div>
            <span className="shrink-0">
              {course.coachRating !== null ? (
                <>
                  <span className="text-amber-500">★</span>{" "}
                  <span className="font-bold text-slate-800">
                    {/* 資料庫的 avg_rating 已四捨五入到小數一位，直接顯示才會和教練檔案一致 */}
                    {course.coachRating.toFixed(1)}
                  </span>
                  <span className="text-slate-400">
                    {" "}
                    ({course.coachReviewCount})
                  </span>
                </>
              ) : (
                <span className="text-slate-400">尚無評價</span>
              )}
            </span>
          </div>

          {course.coachTags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {course.coachTags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                >
                  {tag}
                </li>
              ))}
              {course.coachTags.length > MAX_VISIBLE_TAGS && (
                <li className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-400">
                  +{course.coachTags.length - MAX_VISIBLE_TAGS}
                </li>
              )}
            </ul>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">招募進度</span>
            <span className="font-bold text-slate-800">
              {course.enrolled}/{course.capacity}人
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all duration-500 ${
                isConfirmed ? "bg-emerald-500" : "bg-orange-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-lg font-black text-teal-600">
                NT$ {course.price.toLocaleString()}
              </span>
            </div>
            {/* 報名要選場次，所以已登入時帶到詳情頁；未登入先導向登入頁，登入後回到詳情頁。
                TODO: 報名動作與判斷等 Ted 的 PR #21 進 main 再接 */}
            {isFull ? (
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-400"
              >
                已額滿
              </button>
            ) : (
              <Link
                href={
                  loggedIn
                    ? `/courses/${course.courseId}`
                    : loginHref(`/courses/${course.courseId}`)
                }
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700"
              >
                報名
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
