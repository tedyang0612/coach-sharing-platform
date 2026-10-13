import type { Metadata } from "next";
import { Noto_Sans_TC, Poppins } from "next/font/google";
import { SiteNav } from "@/components/layout/site-nav";
import { ToastViewport } from "@/components/ui/toast";
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
  // 網站圖示（設計師 1013 補充包，檔案在 public/）：SVG 依淺色／深色分頁列各一版，.ico 給舊瀏覽器，
  // apple-touch-icon 給 iPhone 加到主畫面。注意：這不是登入／註冊卡片上方的小狗頭 App 圖示（那是另一個圖）。
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-Hant"
      className={`h-full antialiased ${notoSansTc.variable} ${poppins.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <SiteNav />
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
