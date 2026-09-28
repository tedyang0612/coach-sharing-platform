import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh 邏輯，給根目錄的 proxy.ts 呼叫。
 *
 * 注意：Next.js 16 把 middleware.ts 改名成 proxy.ts（寫法從
 * `export function middleware` 改成 `export default async function proxy`），
 * 這個檔案本身邏輯不變，只是被誰呼叫的入口換了名字。
 *
 * 這裡刻意不 import lib/supabase/server.ts 的 createClient()——
 * 那支是給 Server Component / Route Handler 用的（透過 next/headers 的 cookies()）。
 * proxy 跑在請求進來的最前面，要用 NextRequest/NextResponse 直接讀寫 cookie，
 * 是官方文件裡兩種不同的建構方式，不是重複造輪子。
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 用 getUser() 而不是 getSession()：getUser() 會實際跟 Supabase Auth server 驗證，
  // getSession() 只讀本地 cookie，可能讀到已經失效但還沒過期的 token。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
