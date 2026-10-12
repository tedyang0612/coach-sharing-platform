"use client";

// PRD 1.0 規格8／AC5：封面圖可自行上傳（JPG/PNG、5MB 內）或從圖庫選；不選就用運動項目的預設圖。
// 選檔當下就檢查格式／大小，不合格直接顯示錯誤、不會上傳。

/* eslint-disable @next/next/no-img-element --
   封面圖來源包含 Supabase Storage 網址，用 next/image 要在共用的 next.config.ts 加 remotePatterns；
   MVP 先用 <img>，之後要做圖片最佳化再一起調整。 */

import { useRef, useState } from "react";
import { COVER_FALLBACK, galleryFor, resolveCoverUrl } from "../_lib/cover-image";
import { uploadCoverImage } from "../_lib/upload-cover";

type Props = {
  value: string; // "" = 未設定（使用預設圖）
  sportType: string;
  onChange: (url: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  error?: string;
};

export function CoverPicker({ value, sportType, onChange, onUploadingChange, error }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const previewDialog = useRef<HTMLDialogElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const gallery = galleryFor(sportType);
  const options = gallery.length > 0 ? gallery : [COVER_FALLBACK];
  const preview = resolveCoverUrl({ cover_image_url: value || null, sport_type: sportType });
  const isUploaded = value !== "" && !options.includes(value);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    onUploadingChange(true);
    const result = await uploadCoverImage(file);
    setUploading(false);
    onUploadingChange(false);
    if (fileInput.current) fileInput.current.value = "";
    if (result.ok) onChange(result.url);
    else setUploadError(result.error);
  }

  const shownError = uploadError ?? error;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-neutral-800">課程封面圖</span>

      {/* 這塊就是前台卡片與詳情頁實際會顯示的 16:9 範圍；點一下可以看完整、未裁切的原圖 */}
      <button
        type="button"
        onClick={() => previewDialog.current?.showModal()}
        aria-label="放大預覽課程封面"
        title="點擊查看完整原圖"
        className="relative aspect-video w-full cursor-zoom-in overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <img src={preview} alt="課程封面預覽" className="h-full w-full object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">
          {value === "" ? "系統預設" : isUploaded ? "自行上傳" : "圖庫圖片"}
        </span>
      </button>

      <dialog
        ref={previewDialog}
        aria-label="課程封面完整預覽"
        // 點到圖片以外的暗色區域就關閉
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto max-h-[90vh] max-w-[min(92vw,720px)] rounded-xl bg-white p-4 backdrop:bg-black/60"
      >
        <div className="flex flex-col items-center gap-3">
          <img src={preview} alt="課程封面完整預覽" className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain" />
          <p className="text-center text-xs text-neutral-500">
            這是完整原圖。課程卡片與詳情頁會把圖片置中裁成 16:9，上方預覽框就是實際顯示的範圍。
          </p>
          <button
            type="button"
            onClick={() => previewDialog.current?.close()}
            className="rounded-xl border border-neutral-200 bg-white px-5 py-2 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50"
          >
            關閉
          </button>
        </div>
      </dialog>

      <div className="flex flex-wrap items-center gap-2">
        {options.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => onChange(url)}
            className={`h-14 w-24 overflow-hidden rounded-lg border-2 transition ${
              value === url ? "border-brand" : "border-transparent hover:border-neutral-300"
            }`}
            aria-label="選擇圖庫封面"
            aria-pressed={value === url}
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="h-14 rounded-lg border border-dashed border-neutral-300 px-4 text-xs font-semibold text-neutral-600 transition hover:border-brand hover:text-brand disabled:opacity-50"
        >
          {uploading ? "上傳中…" : "上傳圖片"}
        </button>

        {value !== "" && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs font-semibold text-neutral-500 underline-offset-2 hover:underline"
          >
            改用預設圖
          </button>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {shownError ? (
        <p className="text-xs text-red-600">{shownError}</p>
      ) : (
        <p className="text-xs text-neutral-500">
          支援 JPG／PNG，5MB 以內。未設定時依運動項目顯示預設圖。封面圖為公開內容，請勿放入聯絡資訊。
        </p>
      )}

      <input type="hidden" name="cover_image_url" value={value} />
    </div>
  );
}
