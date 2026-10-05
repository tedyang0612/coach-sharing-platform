import { type InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  /** 欄位下方的說明文字（Figma Input 的 12px 提示） */
  hint?: string;
};

/**
 * Figma「Input」32:1051：標籤 + 輸入框 + 提示／錯誤訊息。
 * Focused／Error／Disabled 由 CSS（focus、aria-invalid、disabled）處理。
 * required 時標籤後面會自動加紅色 *（8.0 QA 建議：必填欄位要有提醒）。
 */
export function TextField({ label, error, hint, id, required, disabled, ...props }: TextFieldProps) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className={`text-label ${disabled ? "text-state-disabled-text" : "text-text-primary"}`}
      >
        {label}
        {required && <span className="ml-0.5 text-state-error">*</span>}
      </label>
      <input
        id={inputId}
        className="text-body rounded-md border border-border-default bg-brand-white px-4 py-3 text-text-primary outline-none transition placeholder:text-text-secondary focus:border-2 focus:border-brand-blue focus:px-[15px] focus:py-[11px] aria-invalid:border-2 aria-invalid:border-state-error aria-invalid:bg-state-error-bg aria-invalid:px-[15px] aria-invalid:py-[11px] disabled:bg-state-disabled-bg disabled:text-state-disabled-text"
        aria-invalid={error ? true : undefined}
        required={required}
        disabled={disabled}
        {...props}
      />
      {error ? (
        <p className="text-caption text-state-error-text">{error}</p>
      ) : (
        hint && (
          <p className={`text-caption ${disabled ? "text-state-disabled-text" : "text-text-secondary"}`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
