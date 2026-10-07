import Link from "next/link";
import { resolveCoverUrl } from "@/app/courses/_lib/cover-image";
import {
  formatDateTime,
  formatSessionTime,
  toV46Wording,
} from "../_lib/display";
import type { MyRegistrationItem } from "../_lib/my-registrations";
import CancelRegistrationButton from "./CancelRegistrationButton";

// 結構先排好，畫面等 UI 定稿再套。狀態、取消與評價的判斷都來自資料層（item 已整理好），這裡不再自己判斷。
export default function MyCourseCard({ item }: { item: MyRegistrationItem }) {
  const { course, session } = item;
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row">
      {!item.unavailable && (
        // 封面網址可能來自 Supabase Storage（外部網域），next.config.ts 還沒設定圖片網域，先用一般 <img>
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveCoverUrl({
            cover_image_url: course.coverImageUrl,
            sport_type: course.sportType,
          })}
          alt=""
          loading="lazy"
          className="h-32 w-full rounded-xl object-cover sm:h-28 sm:w-40"
        />
      )}

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
          <span>訂單編號 {item.orderNumber}</span>
          <span>報名於 {formatDateTime(item.createdAt)}</span>
        </div>

        <h2 className="text-base font-bold text-neutral-900">
          {item.unavailable ? (
            course.title
          ) : (
            <Link href={`/courses/${course.id}`} className="hover:underline">
              {course.title}
            </Link>
          )}
        </h2>

        {!item.unavailable && (
          <>
            <p className="text-sm text-neutral-600">
              📅 {formatSessionTime(session.startAt, session.endAt)}
            </p>
            <p className="text-sm text-neutral-600">📍 {course.locationName}</p>
          </>
        )}

        <p className="text-sm font-medium text-neutral-800">
          {toV46Wording(item.detailLabel)}
          <span className="ml-2 font-normal text-neutral-500">
            NT$ {item.amount.toLocaleString()}
          </span>
        </p>

        {item.announcements.length > 0 && (
          <ul className="space-y-1 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700">
            {item.announcements.map((a) => (
              <li key={a.id}>
                <span className="mr-2 text-xs text-neutral-400">
                  {formatDateTime(a.sent_at)}
                </span>
                {a.content}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {item.cancelButton === "show" && item.cancel.ok && (
            <CancelRegistrationButton
              registrationId={item.registrationId}
              outcome={item.cancel.outcome}
            />
          )}
          {item.cancelButton === "contact_coach" && !item.cancel.ok && (
            <p className="text-sm text-neutral-600">{item.cancel.message}</p>
          )}

          {item.review && (
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
              已評價・{"★".repeat(item.review.rating)}
            </span>
          )}
          {item.canReview && (
            <Link
              href={item.reviewHref}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-90"
            >
              前往評價
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
