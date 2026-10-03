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

interface Props {
  course: Course;
}

export default function CourseCard({ course }: Props) {
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
              ? "✅ 已達開課人數"
              : `🔥 差 ${course.minToOpen - course.enrolled} 人開課`}
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
          </p>
          <p className="mt-1 text-xs text-slate-500">
            📅 {formatDateTime(course.startsAt)}
          </p>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-slate-800">
              {course.coachName}
            </span>
            <span>
              <span className="text-slate-400">招募進度：</span>
              <span className="font-bold text-slate-800">
                {course.enrolled}/{course.capacity}人
              </span>
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
