import Image from "next/image";
import footerWave from "@/components/home/footer-wave.svg";

// Figma「標註｜導覽列與首頁底部」696:4651 C：深藍波浪底（桌機高 230、手機高 198），
// 內容置中：左吉祥物（白色小狗＋GO）、右 Logo／標語／版權（桌機間距 32、手機 16；三行間距桌機 8、手機 6）。
// Logo 與吉祥物只用設計提供的 SVG（深色底版），吉祥物與波浪只出現在首頁 Footer。
export function Footer() {
  return (
    <footer className="relative mt-4 text-text-inverse">
      <Image
        src={footerWave}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[16px] h-[182px] w-full md:top-[39px] md:h-[191px]"
      />
      <div className="relative flex h-[198px] items-center justify-start gap-4 px-[var(--spacing-screen-padding)] pt-8 md:h-[230px] md:gap-8 md:pt-10">
        {/* eslint-disable-next-line @next/next/no-img-element -- 設計提供的 SVG，不需要 next/image 最佳化 */}
        <img src="/brand/logo-full-on-dark.svg" alt="" aria-hidden className="h-[46px] w-[92px] shrink-0 md:h-[90px] md:w-[200px]" />
        <div className="flex flex-col gap-1.5 md:gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- 同上 */}
          <img src="/brand/logo-horizontal-on-dark.svg" alt="夠練 GoLand" className="h-[25px] w-[177px] md:h-10 md:w-[285px]" />
          <p className="text-[13px]">來 GoLand 找夠練（教練）</p>
          <p className="text-[12px] opacity-70">© 夠練 GoLand</p>
        </div>
      </div>
    </footer>
  );
}
