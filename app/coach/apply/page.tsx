import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApplicationForm } from "./application-form";

export const metadata: Metadata = {
  title: "教練身分申請｜夠練 GoLand",
};

export default async function CoachApplyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 帳號預設是學員，要先登入才能申請；登入後回到這一頁
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/coach/apply")}`);
  }

  // 一個帳號只有一份申請，已經送過就改看申請狀態（補件重送也從那邊進）
  const { data: existing } = await supabase
    .from("coach_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) {
    redirect("/coach/application");
  }

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold text-neutral-900">教練身分申請</h1>
          <p className="mt-1 text-sm text-neutral-500">
            為維護課程品質與學員安全，請如實填寫。標示＊為必填。
          </p>
        </header>

        <ApplicationForm />
      </div>
    </main>
  );
}
