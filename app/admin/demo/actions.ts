"use server";

// Demo 排程頁的 server action。這個檔案的每個 export 都是可以被直接 POST 的公開端點，
// 所以不能只靠頁面「看得到才按得到」：真正的管理員檢查在資料庫函式 admin_run_demo_job()（20261005000041），
// 不是管理員（含未登入）呼叫會直接被拒絕。

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isDemoJob, type DemoJobResult, type DemoJobState } from "./_lib/jobs";

export async function runDemoJob(job: string): Promise<DemoJobState> {
  if (!isDemoJob(job)) return { error: "不認得的排程項目" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_run_demo_job", { p_job: job });

  if (error) {
    if (error.message.includes("只有管理員")) return { error: "只有管理員可以使用 Demo 排程" };
    if (error.message.includes("請先登入")) return { error: "請先登入" };
    return { error: "執行失敗，請稍後再試。" };
  }

  revalidatePath("/admin/demo");
  return { ok: true, result: data as DemoJobResult };
}
