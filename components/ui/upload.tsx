"use client";

import Image from "next/image";
import { useState, type InputHTMLAttributes } from "react";
import plus from "./icons/plus.svg";
import plusError from "./icons/plus-error.svg";
import plusMuted from "./icons/plus-muted.svg";

type UploadProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  hint?: string;
  error?: string;
};

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.max(1, Math.round(bytes / 1024))}KB`;

// Figma「Upload」32:1192：虛線框（已選檔＝實線框、顯示「檔名（大小）」；錯誤＝紅虛線；停用＝灰）。
export function Upload({
  label = "上傳檔案",
  hint = "JPG／PNG／PDF，單檔 5MB 以內",
  error,
  disabled,
  onChange,
  className = "",
  ...props
}: UploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const style = disabled
    ? "cursor-not-allowed border-dashed border-border-default bg-state-disabled-bg text-state-disabled-text"
    : error
      ? "cursor-pointer border-dashed border-state-error bg-state-error-bg text-text-primary"
      : `cursor-pointer border-brand-blue bg-brand-light text-text-primary ${file ? "border-solid" : "border-dashed"}`;
  const hintColor = disabled
    ? "text-state-disabled-text"
    : error
      ? "text-state-error-text"
      : "text-text-secondary";
  return (
    <label
      className={`flex flex-col items-center justify-center gap-2 rounded-md border-[1.5px] p-6 text-center focus-within:ring-2 focus-within:ring-brand-blue focus-within:ring-offset-2 ${style} ${className}`}
    >
      <input
        type="file"
        className="sr-only"
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          onChange?.(e);
        }}
        {...props}
      />
      <Image src={disabled ? plusMuted : error ? plusError : plus} alt="" width={24} height={24} />
      <span className="text-body">{file ? `${file.name}（${formatSize(file.size)}）` : label}</span>
      <span className={`text-caption ${hintColor}`}>{error ?? hint}</span>
    </label>
  );
}
