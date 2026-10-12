import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import heroWave from "@/components/home/hero-wave.svg";
import { Footer } from "@/components/layout/footer";
import { Icon } from "@/components/ui/icon";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "我的帳戶｜夠練 GoLand" };

// 學員的「我的帳戶」（導覽列頭像選單 →「我的帳戶」）。設計稿初版（2026-10-12）：頂部問候橫幅、基本資料、
// 通知設定、登出。PRD 還沒有定義這一頁：更換照片、通知設定（優惠通知／Email 通知）需要新欄位，
// 先照設計稿顯示但不能操作；設計稿的「修改密碼」這一列依 Ted 決定先不做。
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent("/account")}`);

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const displayName = profile?.display_name ?? "";

  return (
    <main className="flex-1">
      <section className="relative flex min-h-[320px] items-end overflow-clip md:min-h-[500px]">
        <Image
          src="/images/hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[60%_center]"
        />
        {/* 設計稿的橫幅是整張偏淡的色調：白色疊層讓深藍標題維持足夠對比 */}
        <div className="absolute inset-0 bg-brand-white/65" />
        <div className="relative flex w-full flex-col gap-4 px-[var(--spacing-screen-padding)] pb-24 pt-10 md:flex-row md:items-center md:gap-10 md:pb-32">
          <span
            aria-hidden
            className="relative flex size-[110px] shrink-0 items-center justify-center rounded-pill border-4 border-brand-blue bg-tint-blue-200 text-text-primary md:size-[226px] md:border-[6px]"
          >
            <Icon name="user" className="size-12 md:size-24" />
            {/* 設計稿的「＋」換照片按鈕；頭像功能尚未開放，只顯示、不能點 */}
            <span className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-pill border-2 border-text-primary bg-brand-lime text-text-primary md:size-14">
              <Icon name="plus" className="size-4 md:size-7" />
            </span>
          </span>
          <div className="flex flex-col gap-1 text-brand-deep">
            <h1 className="text-hero-responsive break-words">嗨，{displayName}！</h1>
            <p className="text-h2">你想練的這邊都有！</p>
          </div>
        </div>
        <Image
          src={heroWave}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-auto w-full"
        />
      </section>

      <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-[var(--spacing-screen-padding)] pb-12 pt-4 lg:grid-cols-[2fr_1fr] lg:items-start">
        <section aria-labelledby="account-basic" className="rounded-lg border border-border-default bg-brand-white p-6 md:p-9">
          <h2 id="account-basic" className="text-h2 mb-5 text-text-primary">
            基本資料
          </h2>
          <ProfileForm displayName={displayName} email={user.email ?? ""} />
        </section>

        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="account-notify"
            className="rounded-lg border border-border-default bg-brand-white p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <h2 id="account-notify" className="text-h3 text-text-primary">
                通知設定
              </h2>
              <span className="text-caption text-text-secondary">即將推出</span>
            </div>
            <ul className="flex flex-col gap-4">
              <ToggleRow label="優惠通知" />
              <ToggleRow label="Email 通知" />
            </ul>
          </section>

          <section className="rounded-lg border border-border-default bg-brand-white p-2">
            <form action={logout}>
              <button
                type="submit"
                className="text-body flex w-full items-center gap-3 rounded-md px-4 py-4 text-left text-text-primary transition hover:bg-tint-blue-100"
              >
                <Icon name="log-out" className="size-6" />
                登出
              </button>
            </form>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}

// 通知偏好的開關：資料庫還沒有對應欄位，所以顯示成停用（預設開啟的樣子），不能切換
function ToggleRow({ label }: { label: string }) {
  return (
    <li className="flex items-center justify-between gap-4 text-text-primary">
      <span className="text-body">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked="true"
        aria-label={`${label}（即將推出）`}
        disabled
        className="relative h-8 w-14 shrink-0 cursor-not-allowed rounded-pill bg-brand-blue opacity-50"
      >
        <span className="absolute right-1 top-1 size-6 rounded-pill bg-brand-white" />
      </button>
    </li>
  );
}
