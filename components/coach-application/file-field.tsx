"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  DOCUMENT_MIME_TYPES,
  PHOTO_MIME_TYPES,
} from "@/lib/coach-application/constants";
import {
  validateUploadFile,
  type UploadKind,
} from "@/lib/coach-application/validation";

type FileFieldProps = {
  label: string;
  name: string;
  kind: UploadKind;
  hint?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  // 補件重送時：先前已上傳、這次沒有重選就沿用的檔案
  existing?: { label: string; imageUrl?: string };
  error?: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 單一檔案選擇：選檔當下就檢查格式與大小，不符合的不會留下（PRD 4.0 AC 6）。
 * 這裡只負責「選檔」，實際上傳到 Storage 在送出時處理。
 */
export function FileField({
  label,
  name,
  kind,
  hint,
  file,
  onChange,
  existing,
  error,
}: FileFieldProps) {
  const [rejectMessage, setRejectMessage] = useState<string>();
  const [preview, setPreview] = useState<{ file: File; url: string }>();

  // 圖片才顯示縮圖。用 FileReader 在讀完之後才寫入 state，並記住是哪個檔案的縮圖，
  // 換檔或移除時就不會短暫顯示到上一張
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setPreview({ file, url: String(reader.result) });
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);
  const previewUrl = preview?.file === file ? preview.url : undefined;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    // 清掉 input 的值，同一個檔案被拒絕後才能再選一次
    event.target.value = "";
    if (!selected) return;

    const message = validateUploadFile(selected, kind);
    if (message) {
      setRejectMessage(message);
      return;
    }
    setRejectMessage(undefined);
    onChange(selected);
  }

  const accept = (kind === "photo" ? PHOTO_MIME_TYPES : DOCUMENT_MIME_TYPES).join(",");
  const shownError = rejectMessage ?? error;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-neutral-800">{label}</span>
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}

      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          {previewUrl && (
            // 本機讀出來的預覽圖（data URL），不經過 next/image 的最佳化
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-neutral-900">{file.name}</p>
            <p className="text-xs text-neutral-500">{formatSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-sm font-semibold text-brand hover:underline"
          >
            移除
          </button>
        </div>
      ) : existing ? (
        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          {existing.imageUrl && (
            // 已上傳到 Storage 的公開照片，尺寸很小，不經過 next/image 的最佳化
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={existing.imageUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg object-cover"
            />
          )}
          <p className="min-w-0 flex-1 text-sm text-neutral-700">{existing.label}</p>
          <label
            htmlFor={name}
            className="shrink-0 cursor-pointer text-sm font-semibold text-brand hover:underline"
          >
            重新選擇
          </label>
        </div>
      ) : (
        <label
          htmlFor={name}
          className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-neutral-300 px-4 py-5 text-center transition hover:border-brand"
        >
          <span className="text-sm font-semibold text-brand">選擇檔案</span>
          <span className="text-xs text-neutral-500">
            {kind === "photo" ? "JPG、PNG" : "JPG、PNG、PDF"}，5MB 以內
          </span>
        </label>
      )}

      <input
        id={name}
        name={name}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="sr-only"
      />
      {shownError && <p className="text-xs text-red-600">{shownError}</p>}
    </div>
  );
}
