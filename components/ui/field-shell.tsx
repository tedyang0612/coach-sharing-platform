import { type ReactNode } from "react";

// Select／Textarea 共用的「標籤 + 欄位 + 提示／錯誤」外框，與 TextField 同一套規則。
export function FieldShell({
  label,
  htmlFor,
  required,
  disabled,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className={`text-label ${disabled ? "text-state-disabled-text" : "text-text-primary"}`}
      >
        {label}
        {required && <span className="ml-0.5 text-state-error">*</span>}
      </label>
      {children}
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
