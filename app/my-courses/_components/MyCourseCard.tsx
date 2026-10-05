import Link from "next/link";
import { resolveCoverUrl } from "@/app/courses/_lib/cover-image";
import {
  COPY,
  formatDeadline,
  formatSessionTime,
} from "../_lib/display";
import type { MyRegistrationItem } from "../_lib/my-registrations";
import CancelRegistrationButton from "./CancelRegistrationButton";
import StatusLine from "./StatusLine";

const OUTLINE_BUTTON =
  "text-button flex items-center justify-center rounded-full border border-(--color-brand-blue) bg-(--color-surface-default) px-5 py-2.5 text-(--color-text-primary) hover:bg-(--color-tint-blue-100)";
const PRIMARY_BUTTON =
  "text-button flex items-center justify-center rounded-full bg-(--color-brand-blue) px-5 py-2.5 text-(--color-text-inverse) hover:bg-(--color-brand-blue-pressed)";
const TEXT_BUTTON =
  "text-button flex items-center justify-center rounded-full px-5 py-2.5 text-(--color-text-primary) hover:bg-(--color-tint-blue-100)";

function Note({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "info" }) {
  return (
    <p
      className={`text-body-small rounded-(--radius-md) px-3 py-2.5 text-(--color-text-secondary) ${
        tone === "info"
          ? "border border-(--color-brand-blue) bg-(--color-tint-blue-100) text-(--color-text-primary)"
          : "bg-(--color-brand-light)"
      }`}
    >
      {children}
    </p>
  );
}

// 版型依設計稿 S09：左邊縮圖、右邊標題與時間地點，下面狀態列、說明框、按鈕。
// 狀態、取消與評價的判斷都來自資料層（item 已整理好），這裡不再自己判斷。
// 待確認開課的「差 N 人開課」進度條需要場次報名人數與上下限，資料層沒帶，下一輪補。
export default function MyCourseCard({ item }: { item: MyRegistrationItem }) {
  const { course, session } = item;
  const courseHref = item.unavailable
    ? null
    : `/courses/${course.id}?session=${session.id}`;
  const cancelled = item.category === "cancelled";

  // 說明框的內容：依狀態決定，設計稿沒畫的情況不硬加
  let note: React.ReactNode = null;
  if (item.category === "pending") {
    note = (
      <Note>
        預計於 {formatDeadline(session.registrationDeadlineAt)} 通知是否確定開課，確定開課後才會扣款。
      </Note>
    );
  } else if (item.category === "confirmed") {
    if (item.cancelButton === "contact_coach") {
      note = <Note tone="info">{COPY.contactCoach}</Note>;
    } else if (item.announcements.length > 0) {
      note = <Note>{COPY.confirmedAnnouncement}</Note>;
    }
  } else if (item.category === "completed") {
    note = item.review ? (
      <Note>你的評價：{item.review.rating} 顆星，謝謝你的回饋。</Note>
    ) : item.canReview ? (
      <Note>{COPY.reviewPrompt}</Note>
    ) : null;
  } else if (cancelled) {
    if (item.status === "cancelled") note = <Note>{COPY.cancelledNoCharge}</Note>;
    else if (item.status === "refunded" && item.session.status !== "cancelled_by_coach")
      note = <Note>{COPY.refundedFull}</Note>;
  }

  // 按鈕：同一排最多兩顆；確定開課的卡片設計稿沒有「查看課程」，只有取消與查看行前公告
  const buttons: React.ReactNode[] = [];
  if (item.cancelButton === "show" && item.cancel.ok) {
    buttons.push(
      <CancelRegistrationButton
        key="cancel"
        registrationId={item.registrationId}
        outcome={item.cancel.outcome}
        className={OUTLINE_BUTTON}
      />,
    );
  }
  if (item.canReview) {
    buttons.push(
      <Link key="review" href={item.reviewHref} className={PRIMARY_BUTTON}>
        撰寫評價
      </Link>,
    );
  }
  if (item.category === "confirmed") {
    // 通知中心是牛牛的 7.0（/notifications），合併前點不開
    buttons.push(
      <Link key="announcement" href="/notifications" className={PRIMARY_BUTTON}>
        查看行前公告
      </Link>,
    );
  } else if (courseHref) {
    buttons.push(
      <Link key="view" href={courseHref} className={TEXT_BUTTON}>
        查看課程
      </Link>,
    );
  }

  return (
    <article className="space-y-3 rounded-(--radius-lg) border border-(--color-border-default) bg-(--color-surface-default) p-4">
      <div className="flex gap-4">
        {!item.unavailable && (
          // 封面可能來自 Supabase Storage（外部網域），不設定 next/image 網域，用一般 img
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveCoverUrl({
              cover_image_url: course.coverImageUrl,
              sport_type: course.sportType,
            })}
            alt=""
            loading="lazy"
            className="h-18 w-18 shrink-0 rounded-(--radius-md) bg-(--color-tint-blue-100) object-cover"
          />
        )}
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-body font-bold">
            {courseHref ? (
              <Link href={courseHref} className="hover:underline">
                {course.title}
              </Link>
            ) : (
              course.title
            )}
          </h2>
          {!item.unavailable && (
            <>
              <p className="text-body-small font-bold">
                {formatSessionTime(session.startAt, session.endAt)}
              </p>
              <p className="text-body-small text-(--color-text-secondary)">{course.locationName}</p>
            </>
          )}
        </div>
      </div>

      <StatusLine item={item} />
      {note}

      {item.category === "completed" && item.review ? (
        <button
          type="button"
          disabled
          className="text-button w-full rounded-full bg-(--color-state-disabled-bg) px-5 py-2.5 text-(--color-state-disabled-text)"
        >
          已評價
        </button>
      ) : (
        buttons.length > 0 && (
          <div className={`grid gap-3 ${buttons.length > 1 ? "grid-cols-2" : ""}`}>{buttons}</div>
        )
      )}
    </article>
  );
}
