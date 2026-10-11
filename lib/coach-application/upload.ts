import { createClient } from "@/lib/supabase/client";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

/**
 * 從瀏覽器把檔案直接傳到 Supabase Storage，回傳檔案在 bucket 裡的路徑。
 * 不經過 Server Action，因為 Server Action 的請求大小預設上限是 1MB，而檔案上限是 5MB。
 * 失敗時丟出 Error，訊息可以直接顯示給使用者。
 */
export async function uploadCoachFile(
  bucket: string,
  userId: string,
  label: string,
  file: File
): Promise<string> {
  const extension = EXTENSIONS[file.type];
  if (!extension) throw new Error("不支援的檔案格式");

  // 檔名加上亂數，重新上傳時不會蓋到舊檔，也不需要覆寫權限
  const path = `${userId}/${label}-${crypto.randomUUID()}.${extension}`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type });

  if (error) throw new Error("檔案上傳失敗，請稍後再試。");
  return path;
}
