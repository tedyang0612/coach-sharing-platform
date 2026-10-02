import { LEVEL_LABELS, type Course } from "@/lib/courses/types";

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  }).format(new Date(iso));
}

// 頭像網址來自 Supabase Storage（外部網域），next.config.ts 還沒設定圖片網域，
// 所以先用一般 <img>；沒有頭像時顯示姓名首字。
function CoachAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        loading="lazy"
        className="h-7 w-7 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700"
    >
      {Array.from(name)[0]}
    </span>
  );
}

const MAX_VISIBLE_TAGS = 3;

interface Props {
  course: Course;
  distanceKm?: number | null;
}

export default function CourseCard({ course, distanceKm }: Props) {
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
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm ${
              isConfirmed ? "bg-emerald-500" : "bg-orange-500"
            }`}
          >
            {isConfirmed
              ? "✅ 已成團"
              : `🔥 差 ${course.minToOpen - course.enrolled} 人成團`}
          </span>
        </div>
        <div className="absolute bottom-3 right-3 rounded-lg bg-slate-900/80 px-2.5 py-1 text-xs text-white backdrop-blur-md">
          {LEVEL_LABELS[course.level]}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-4 p-5">
        <div>
          <h3 className="line-clamp-2 text-base font-bold text-slate-900 transition-colors group-hover:text-teal-700">
            {course.title}
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            📍 {course.city}・{course.venue}
            {distanceKm != null && (
              <span className="font-semibold text-teal-600">
                ・約 {distanceKm.toFixed(1)} 公里
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            📅 {formatDateTime(course.startsAt)}
          </p>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex min-w-0 items-center gap-2">
              <CoachAvatar
                name={course.coachName}
                photoUrl={course.coachPhotoUrl}
              />
              <span className="truncate font-semibold text-slate-800">
                {course.coachName}
              </span>
              {course.coachVerified && (
                <span className="shrink-0 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                  ✓ 已認證
                </span>
              )}
            </div>
            <span className="shrink-0">
              {course.coachRating !== null ? (
                <>
                  <span className="text-amber-500">★</span>{" "}
                  <span className="font-bold text-slate-800">
                    {/* 捨去而不是四捨五入，避免 4.95 顯示成滿分 5.0 */}
                    {(Math.floor(course.coachRating * 10) / 10).toFixed(1)}
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
              <span className="text-xs text-slate-400">固定每人 </span>
              <span className="text-lg font-black text-teal-600">
                NT$ {course.price.toLocaleString()}
              </span>
            </div>
            {/* TODO: 等 Ted 的登入頁合併進 main 後，再接「未登入導向登入頁」 */}
            <button
              type="button"
              disabled={isFull}
              className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {isFull ? "已額滿" : "報名"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
