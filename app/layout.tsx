import type { Metadata } from "next";
import { Noto_Sans_TC, Poppins } from "next/font/google";
import "./globals.css";

// 中文 Noto Sans TC；英數字 Poppins（Poppins 沒有中文字，只用在英數字）。
// preload: false 才會帶上所有中文 unicode-range 切片。
const notoSansTc = Noto_Sans_TC({
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
  variable: "--font-noto-sans-tc",
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "夠練 GoLand",
  description: "三方媒合平台（教練／學員／場地）",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-Hant"
      className={`h-full antialiased ${notoSansTc.variable} ${poppins.variable}`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
