import Link from "next/link";
import type { CourseAvailability } from "@/lib/course-status/getCourseAvailability";

const MESSAGES: Record<
  Exclude<CourseAvailability, "open">,
  { title: string; detail: string }
> = {
  full: {
    title: "這堂課已額滿",
    detail: "目前名額已滿，可以到教練個人檔案看看其他課程。",
  },
  ended: {
    title: "這堂課已結束",
    detail: "報名已關閉，可以到教練個人檔案看看其他課程。",
  },
  cancelled: {
    title: "這堂課已取消",
    detail: "這個場次已取消，可以到教練個人檔案看看其他課程。",
  },
};

interface Props {
  availability: CourseAvailability;
  coachProfileHref?: string;
}

// 招生中不顯示任何東西；其他狀態顯示提示，並引導到教練檔案。
// 報名按鈕要不要顯示，請用 canRegister(availability) 判斷。
export default function CourseStatusNotice({
  availability,
  coachProfileHref,
}: Props) {
  if (availability === "open") return null;
  const { title, detail } = MESSAGES[availability];

  return (
    <div
      role="status"
      className="rounded-(--radius-lg) border border-(--color-border-default) bg-(--color-surface-subtle) p-4 text-(--color-text-primary)"
    >
      <p className="text-h3">{title}</p>
      <p className="mt-1 text-body-small text-(--color-text-secondary)">{detail}</p>
      {coachProfileHref && (
        <Link
          href={coachProfileHref}
          className="text-button mt-3 inline-block rounded-full border border-(--color-brand-blue) bg-(--color-surface-default) px-5 py-2 text-(--color-text-primary) hover:bg-(--color-tint-blue-100)"
        >
          看教練的其他課程
        </Link>
      )}
    </div>
  );
}
