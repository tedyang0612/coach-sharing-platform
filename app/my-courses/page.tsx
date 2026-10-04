import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MyCourseCard from "./_components/MyCourseCard";
import { TAB_LABELS } from "./_lib/display";
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

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8 text-neutral-800">
      <h1 className="text-2xl font-black text-neutral-900">我的課程</h1>

      <nav aria-label="報名狀態" className="flex gap-2 overflow-x-auto pb-1">
        {MY_REGISTRATION_CATEGORIES.map((category) => (
          <Link
            key={category}
            href={category === "pending" ? "/my-courses" : `/my-courses?tab=${category}`}
            aria-current={category === tab ? "page" : undefined}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${
              category === tab
                ? "border-brand bg-brand text-white"
                : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            {TAB_LABELS[category]}（{groups[category].length}）
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          <p>目前沒有「{TAB_LABELS[tab]}」的課程</p>
          <Link href="/courses" className="mt-3 inline-block font-medium text-brand underline">
            去看看課程
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.registrationId}>
              <MyCourseCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
