import type { NextConfig } from "next";

// 教練照片、課程封面存在 Supabase Storage（公開 bucket），next/image 要先允許這個圖片來源。
// 主機名稱從 NEXT_PUBLIC_SUPABASE_URL 取，不寫死專案 ref。
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;
