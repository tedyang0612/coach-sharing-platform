import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "教練共課平台",
  description: "三方媒合平台（教練／學員／場地）",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
