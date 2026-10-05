import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GolandTheme from "@/components/goland/GolandTheme";
import MyCourseCard from "./_components/MyCourseCard";
import { SearchIcon } from "./_components/Icons";
import { COPY, TAB_LABELS, TAB_ORDER } from "./_lib/display";
import {
  MY_REGISTRATION_CATEGORIES,
  groupMyRegistrations,
  type MyRegistrationCategory,
} from "./_lib/my-registrations";
import { listMyRegistrations } from "./_lib/queries";

function parseTab(value: string | string[] | undefined): MyRegistrationCategory {
  const raw = Array.isArray(value) ? value[0] : value;
  return MY_REGISTRATION_CATEGORIES.find((c) => c === raw) ?? "pending";
}

// 學員的「我的課程」：四個頁籤（待確認開課、確定開課、已取消、已完成）。
// 報名成功的通知會連到這個路徑，所以路徑要維持 /my-courses。
export default async function MyCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent("/my-courses")}`);

  const tab = parseTab((await searchParams).tab);
  const groups = groupMyRegistrations(await listMyRegistrations(supabase, user.id));
  const items = groups[tab];

  const hasAny = TAB_ORDER.some((category) => groups[category].length > 0);

  return (
    <GolandTheme>
      <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-6 px-(--spacing-screen-padding) py-8">
        {/* 桌機內容約 960 寬置中（設計稿），手機滿版 */}
        <div className="mx-auto w-full max-w-[960px] space-y-6">
          <h1 className="text-h1">我的課程</h1>

          {/* 頁籤順序依設計稿；文字頁籤，選中加粗並有底線，不顯示數量 */}
          <nav
            aria-label="報名狀態"
            className="flex gap-6 overflow-x-auto border-b border-(--color-border-default)"
          >
            {TAB_ORDER.map((category) => (
              <Link
                key={category}
                href={category === "pending" ? "/my-courses" : `/my-courses?tab=${category}`}
                aria-current={category === tab ? "page" : undefined}
                className={`text-body -mb-px shrink-0 border-b-2 pb-2 ${
                  category === tab
                    ? "border-(--color-brand-blue) font-bold text-(--color-text-primary)"
                    : "border-transparent text-(--color-text-secondary) hover:text-(--color-text-primary)"
                }`}
              >
                {TAB_LABELS[category]}
              </Link>
            ))}
          </nav>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-(--radius-lg) bg-(--color-brand-light) px-4 py-12 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-(--color-tint-blue-100)">
                <SearchIcon size={24} />
              </span>
              <p className="text-body-large">
                {hasAny ? `目前沒有「${TAB_LABELS[tab]}」的課程` : COPY.emptyAll}
              </p>
              <Link
                href="/courses"
                className="text-button rounded-full bg-(--color-brand-blue) px-8 py-2.5 text-(--color-text-inverse) hover:bg-(--color-brand-blue-pressed)"
              >
                {COPY.explore}
              </Link>
            </div>
          ) : (
            <ul className="grid items-start gap-4 lg:grid-cols-2">
              {items.map((item) => (
                <li key={item.registrationId}>
                  <MyCourseCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </GolandTheme>
  );
}
