"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { buttonClassName } from "@/components/ui/button";
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
  /**
   * 版面（設計稿 C01）：
   * - photo：左邊照片預覽、右邊「更換照片」按鈕與說明（大頭貼、生活／運動照片）
   * - dropzone：整塊的上傳框（良民證）
   * - inline：和文字欄位同高的一列（證照檔案）
   */
  layout?: "photo" | "dropzone" | "inline";
  // photo 版面的預覽形狀：大頭貼圓形，生活／運動照片直式
  previewShape?: "circle" | "portrait";
  // 必填時在標籤後面加紅色 *
  required?: boolean;
  error?: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
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
  layout = kind === "photo" ? "photo" : "dropzone",
  previewShape = "circle",
  required = false,
  error,
}: FileFieldProps) {
  // 必填用紅色 * 標示，和 TextField 一致
  const requiredMark = required ? <span className="ml-0.5 text-state-error">*</span> : null;
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
  const formatHint = kind === "photo" ? "JPG／PNG，5MB 以內" : "JPG／PNG／PDF，單檔 5MB 以內";
  const hasFile = Boolean(file) || Boolean(existing);
  const fileText = file ? `${file.name}（${formatSize(file.size)}）` : existing?.label;

  const input = (
    <input
      id={name}
      name={name}
      type="file"
      accept={accept}
      onChange={handleChange}
      aria-invalid={shownError ? true : undefined}
      className="sr-only"
    />
  );

  if (layout === "photo") {
    const imageUrl = previewUrl ?? (file ? undefined : existing?.imageUrl);
    const frame =
      previewShape === "circle" ? "size-[66px] rounded-pill" : "h-20 w-[60px] rounded-md";
    return (
      <div className="flex items-center gap-4">
        <div className={`${frame} shrink-0 overflow-hidden bg-tint-blue-200`}>
          {imageUrl && (
            // 本機預覽（data URL）或已上傳的公開照片，尺寸很小，不經過 next/image 的最佳化
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="size-full object-cover" />
          )}
        </div>
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <label
            htmlFor={name}
            className={`${buttonClassName("secondary")} cursor-pointer focus-within:ring-2 focus-within:ring-brand-blue focus-within:ring-offset-2`}
          >
            {input}
            {hasFile ? "更換照片" : "選擇照片"}
          </label>
          {shownError ? (
            <p data-field-error className="text-caption text-state-error-text">
              {shownError}
            </p>
          ) : (
            <p className="text-caption text-text-secondary">
              {label}
              {requiredMark}：{hint ?? formatHint}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (layout === "inline") {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-label text-text-primary">
          {label}
          {requiredMark}
        </span>
        <label
          htmlFor={name}
          className={`text-body flex cursor-pointer items-center justify-between gap-3 rounded-md border bg-brand-white px-4 py-3 focus-within:border-2 focus-within:border-brand-blue focus-within:px-[15px] focus-within:py-[11px] ${
            shownError ? "border-2 border-state-error bg-state-error-bg px-[15px] py-[11px]" : "border-border-default"
          }`}
        >
          {input}
          <span className={`min-w-0 truncate ${hasFile ? "text-text-primary" : "text-text-secondary"}`}>
            {fileText ?? "選擇檔案"}
          </span>
          <span className="text-label shrink-0 text-brand-deep">{hasFile ? "更換" : "上傳"}</span>
        </label>
        <p
          data-field-error={shownError ? true : undefined}
          className={`text-caption ${shownError ? "text-state-error-text" : "text-text-secondary"}`}
        >
          {shownError ?? hint ?? formatHint}
        </p>
      </div>
    );
  }

  // dropzone：未選＝虛線＋加號；已選＝實線、底色加深、加號換成打勾並寫明「已選擇檔案」，
  // 一眼看得出檔案有選到（QA 回饋：原本選完只有檔名，不夠明顯，加號也容易誤會成還沒選）
  const selected = hasFile && !shownError;
  const boxStyle = shownError
    ? "border-dashed border-state-error bg-state-error-bg"
    : selected
      ? "border-solid border-brand-deep bg-tint-blue-200"
      : "border-dashed border-brand-blue bg-brand-light";
  return (
    <label
      htmlFor={name}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-[1.5px] p-6 text-center text-text-primary focus-within:ring-2 focus-within:ring-brand-blue focus-within:ring-offset-2 ${boxStyle}`}
    >
      {input}
      {selected ? (
        <>
          <span className="text-label flex items-center gap-2 text-brand-deep">
            <span
              aria-hidden="true"
              className="flex size-6 items-center justify-center rounded-pill bg-brand-deep text-text-inverse"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            </span>
            已選擇檔案
          </span>
          <span className="text-body max-w-full break-all font-medium">{fileText}</span>
          <span className="text-caption text-text-secondary">點這裡可以更換檔案</span>
        </>
      ) : (
        <>
          <span aria-hidden="true" className="text-h2 leading-none">
            ＋
          </span>
          <span className="text-body">
            {label}
            {requiredMark}
          </span>
          <span
            data-field-error={shownError ? true : undefined}
            className={`text-caption ${shownError ? "text-state-error-text" : "text-text-secondary"}`}
          >
            {shownError ?? hint ?? formatHint}
          </span>
        </>
      )}
    </label>
  );
}
