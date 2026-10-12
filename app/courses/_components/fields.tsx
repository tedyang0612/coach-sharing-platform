// 開課表單用的下拉選單／多行輸入框，外觀與標籤樣式比照 components/ui/text-field.tsx（同一套 FIELD_CLASSES）。
// components/ui 目前沒有這兩種，先放在 1.0 模組內；之後其他模組也需要的話再提到 components/ui（共用檔，要先在群組說）。

import { type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { FIELD_CLASSES } from "@/components/ui/field-styles";

export function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  disabled,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className={`text-label ${disabled ? "text-state-disabled-text" : "text-text-primary"}`}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-caption text-state-error-text">{error}</p>
      ) : (
        hint && <p className={`text-caption ${disabled ? "text-state-disabled-text" : "text-text-secondary"}`}>{hint}</p>
      )}
    </div>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function SelectField({ label, hint, error, id, children, ...props }: SelectFieldProps) {
  const inputId = id ?? props.name;
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} disabled={props.disabled}>
      <select id={inputId} className={FIELD_CLASSES} aria-invalid={error ? true : undefined} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextAreaField({ label, hint, error, id, ...props }: TextAreaFieldProps) {
  const inputId = id ?? props.name;
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} disabled={props.disabled}>
      <textarea
        id={inputId}
        rows={4}
        className={`${FIELD_CLASSES} resize-y leading-relaxed`}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </FieldShell>
  );
}

/** 表單分區卡片 */
export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-base font-bold text-neutral-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}
