import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16：這個檔案取代了舊版的 middleware.ts（寫法改成 export default，
 * 檔名也從 middleware 改成 proxy，行為完全一樣）。
 *
 * 這裡目前只做一件事：每個請求進來時，順便把 Supabase 的 session cookie 刷新，
 * 避免 Server Component 讀到過期的登入狀態。
 *
 * 「登入註冊／個人資料頁」那個支線任務如果需要做「未登入導去 /login」
 * 「已登入卻在 /login 導去首頁」這類頁面保護邏輯，可以在這裡加：
 *
 *   const { supabaseResponse, user } = await updateSession(request);
 *   const isProtectedRoute = ['/dashboard'].includes(request.nextUrl.pathname);
 *   if (isProtectedRoute && !user) {
 *     return NextResponse.redirect(new URL('/login', request.url));
 *   }
 *   return supabaseResponse;
 *
 * 動這裡之前先在群組講一聲——這是共用檔案。
 */
export default async function proxy(request: NextRequest) {
  const { supabaseResponse } = await updateSession(request);
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 排除以下路徑，避免每個靜態資源請求都跑一次 Supabase session 檢查：
     * - _next/static, _next/image：Next.js 內部資源
     * - favicon.ico
     * - 常見圖片副檔名
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
