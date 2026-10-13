import Image from "next/image";
import heroWave from "@/components/home/hero-wave.svg";
import { HeroAvatar } from "./hero-avatar";

// S13 頂部橫幅（1013 補充：Figma 586:9410／586:9617）。
// 不放任何照片／底圖、不疊遮罩，底色是由上到下的純藍色漸層（brand-light → tint-blue-200）；
// 底部波浪保留，顏色同頁面底色（桌機高 72、手機高 21）。
export function AccountHero({ avatarUrl, displayName }: { avatarUrl: string | null; displayName: string }) {
  return (
    <section className="relative flex min-h-[285px] items-center overflow-clip bg-linear-to-b from-brand-light to-tint-blue-200 md:min-h-[440px]">
      <div className="relative flex w-full flex-col items-center gap-4 px-[var(--spacing-screen-padding)] pb-12 pt-8 text-center md:flex-row md:gap-10 md:pb-16 md:pt-10 md:text-left">
        <HeroAvatar avatarUrl={avatarUrl} />
        <div className="flex flex-col gap-1 text-brand-deep">
          <h1 className="text-hero-responsive break-words">嗨，{displayName}！</h1>
          <p className="text-h2">你想練的這邊都有！</p>
        </div>
      </div>
      <Image
        src={heroWave}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[21px] w-full md:h-[72px]"
      />
    </section>
  );
}
