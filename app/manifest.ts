import type { MetadataRoute } from "next";

// PWA／Android「加到主畫面」用。圖示是設計師提供的 icon-192／icon-512（白底），放在 public/。
// 顏色是 manifest 規格要的字面值（不能用 CSS 變數）：background_color 對應頁面底色 --color-surface-page。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "夠練 GoLand",
    short_name: "夠練",
    description: "三方媒合平台（教練／學員／場地）",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F6F6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
