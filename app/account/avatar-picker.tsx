"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { MAX_FILE_SIZE_BYTES, PHOTO_MIME_TYPES } from "@/lib/coach-application/constants";
import { uploadCoachFile } from "@/lib/coach-application/upload";
import { createClient } from "@/lib/supabase/client";
import { updateAvatar } from "./actions";
import { AVATAR_BUCKET } from "./constants";

type PickerApi = { open: () => void; busy: boolean; error?: string };

/**
 * 選圖 → 檢查格式與大小 → 直接從瀏覽器傳到 Supabase Storage（avatars bucket，{使用者 id}/ 底下）→
 * 把公開網址存進 profiles.avatar_url。不經過 Server Action 傳檔案（上限 1MB，照片上限 5MB）。
 * 觸發按鈕由呼叫端用 children 畫（頂部頭像的「＋」與基本資料的「更換照片」共用這支邏輯）。
 */
export function AvatarPicker({
  userId,
  avatarUrl,
  children,
}: {
  userId: string;
  /** 目前已儲存的頭像網址：任何一個入口上傳成功後它會變，這時另一個入口留下的舊錯誤訊息就該消失 */
  avatarUrl: string | null;
  children: (api: PickerApi) => ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [errorState, setErrorState] = useState<{ message: string; forAvatar: string | null }>();
  const setError = (message: string | undefined) => setErrorState(message ? { message, forAvatar: avatarUrl } : undefined);
  const error = errorState && errorState.forAvatar === avatarUrl ? errorState.message : undefined;
  const [busy, startTransition] = useTransition();

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(undefined);
    if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("請選擇 JPG 或 PNG 圖片");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("圖片大小請在 5MB 以內");
      return;
    }
    startTransition(async () => {
      try {
        const path = await uploadCoachFile(AVATAR_BUCKET, userId, "avatar", file);
        const { data } = createClient().storage.from(AVATAR_BUCKET).getPublicUrl(path);
        const result = await updateAvatar(data.publicUrl);
        if (!result.ok) setError(result.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "上傳失敗，請稍後再試。");
      }
    });
  }

  function open() {
    input.current?.click();
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          // 清掉選取，同一張圖再選一次也會觸發
          event.target.value = "";
        }}
      />
      {/* eslint-disable-next-line react-hooks/refs -- open() 只在使用者點擊時才讀 ref，不是在 render 期間讀 */}
      {children({ open, busy, error })}
    </>
  );
}
