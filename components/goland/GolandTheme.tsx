import { Noto_Sans_TC, Poppins } from "next/font/google";
import "./goland-tokens.css";

// 中文 Noto Sans TC；英文與數字 Poppins（Poppins 沒有中文字，只用在英數字，見 tokens 的 .text-number）
const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-noto-sans-tc",
  display: "swap",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

// 把頁面包在設計師的 token 與字體裡（頁面底色 #F6F6F6）。
// 目前只有學員端課程頁用；全站套用要改 globals.css／layout.tsx（共用檔，要先在群組說），
// 到時候這個外層就能拿掉。
export default function GolandTheme({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`goland ${notoSansTC.variable} ${poppins.variable} flex flex-1 flex-col bg-(--color-surface-page) font-(family-name:--font-cjk) text-(--color-text-primary)`}
    >
      {children}
    </div>
  );
}
