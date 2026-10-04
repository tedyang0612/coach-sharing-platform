import { type InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

/**
 * 共用的「標籤 + 輸入框 + 錯誤訊息」元件，手機／桌面寬度都用同一套，
 * 不需要額外的響應式斷點（輸入框本來就是滿版）。
 * required 時標籤後面會自動加紅色 *（8.0 QA 建議：必填欄位要有提醒）。
 */
export function TextField({ label, error, id, required, ...props }: TextFieldProps) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-neutral-800">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      <input
        id={inputId}
        className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-ink"
        aria-invalid={error ? true : undefined}
        required={required}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
