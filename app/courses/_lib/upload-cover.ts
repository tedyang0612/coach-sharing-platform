// 封面圖上傳（Client Component 用）：瀏覽器直接傳到 Supabase Storage，表單只送回公開網址。
// 不走 server action 傳檔：server action 預設 body 上限 1MB，5MB 的圖會被擋，調上限又要改共用的 next.config.ts。
// 格式／大小在這裡先擋一次，bucket 層（file_size_limit／allowed_mime_types）會再擋一次。

import { createClient } from "@/lib/supabase/client";
import { COVER_BUCKET, coverStoragePath, validateCoverFile } from "./cover-image";

export type UploadCoverResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadCoverImage(file: File): Promise<UploadCoverResult> {
  const invalid = validateCoverFile(file);
  if (invalid) return { ok: false, error: invalid };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "請先登入" };

  const path = coverStoragePath(user.id, file.type);
  const { error } = await supabase.storage.from(COVER_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { ok: false, error: "封面圖上傳失敗，請稍後再試。" };

  const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
