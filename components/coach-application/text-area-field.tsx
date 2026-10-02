import { type TextareaHTMLAttributes } from "react";

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
};

/**
 * 多行輸入框，樣式比照 components/ui/text-field.tsx。
 * 共用 UI 目前沒有 textarea 版本，先放在教練申請自己的資料夾；之後別的模組也要用再搬去 components/ui。
 */
export function TextAreaField({ label, hint, error, id, ...props }: TextAreaFieldProps) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-neutral-800">
        {label}
      </label>
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
      <textarea
        id={inputId}
        rows={4}
        className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-ink"
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
