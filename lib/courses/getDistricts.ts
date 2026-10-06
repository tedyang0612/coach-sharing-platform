import { createClient } from "@/lib/supabase/server";
import type { DistrictRow } from "./regions";

// 讀資料庫的 districts 表（任何人含未登入都能讀，只讀）。
// 讀不到（沒連線、權限、網路）就回傳 null，由呼叫端退回備用做法，頁面不會壞。
export async function getDistricts(): Promise<DistrictRow[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("districts")
      .select("towncode, city, district")
      .order("towncode");
    return error || !data?.length ? null : data;
  } catch {
    return null;
  }
}
