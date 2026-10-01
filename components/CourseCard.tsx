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

export default function CourseCard({ course }: { course: Course }) {
  const isConfirmed = course.enrolled >= course.minToOpen;
  const isFull = course.enrolled >= course.capacity;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-sm">
      {/* 先用漸層佔位；之後有課程圖片欄位再換成 next/image */}
      <div className="relative h-40 bg-gradient-to-br from-teal-100 to-sky-200">
        <div className="absolute left-3 top-3 flex gap-2 text-sm">
          <span className="rounded-full bg-white px-3 py-1 font-medium">
            {course.sport}
          </span>
          {isConfirmed ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
              ✅ 已成團
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">
              揪團中 {course.enrolled}/{course.minToOpen}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg font-semibold">{course.title}</h3>
        <p className="text-sm text-neutral-500">教練：{course.coachName}</p>
        <ul className="space-y-1 text-sm text-neutral-700">
          <li>📍 {course.city}・{course.venue}</li>
          <li>🕒 {formatDateTime(course.startsAt)}</li>
          <li>💪 {LEVEL_LABELS[course.level]}</li>
        </ul>

        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-lg font-semibold">
            NT$ {course.price.toLocaleString()}
          </span>
          {/* TODO: 等 Ted 的登入頁合併進 main 後，再接「未登入導向登入頁」 */}
          <button
            type="button"
            disabled={isFull}
            className="rounded-full bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {isFull ? "已額滿" : "報名"}
          </button>
        </div>
      </div>
    </article>
  );
}
