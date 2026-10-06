import Image from "next/image";
import footerWave from "@/components/home/footer-wave.svg";

// Figma「Footer」37:1089：深藍波浪底，只有標誌與標語（PRD 14.0 規格 7）。
// 標誌用設計提供的「深色底」版本（深藍改白）；波浪上緣即與上一個區塊的銜接。
export function Footer() {
  return (
    <footer className="relative mt-4 text-text-inverse">
      <Image
        src={footerWave}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[16px] h-[197px] w-full md:top-[39px] md:h-[227px]"
      />
      <div className="relative flex flex-col gap-2 px-[var(--spacing-screen-padding)] pb-8 pt-[54px] md:pt-[86px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- 設計提供的 SVG，不需要 next/image 最佳化 */}
        <img src="/brand/logo-horizontal-on-dark.svg" alt="夠練 GoLand" width={285} height={58} />
        <p className="text-body-small">讓教練好好教，讓學員好好練。</p>
        <p className="text-caption opacity-70">© 夠練 GoLand</p>
      </div>
    </footer>
  );
}
