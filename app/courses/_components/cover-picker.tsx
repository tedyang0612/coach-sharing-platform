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

      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
        <img src={preview} alt="課程封面預覽" className="h-full w-full object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">
          {value === "" ? "預設圖" : isUploaded ? "自行上傳" : "圖庫"}
        </span>
      </div>

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
