// 開課表單用的下拉選單／多行輸入框，樣式比照 components/ui/text-field.tsx。
// components/ui 目前沒有這兩種，先放在 1.0 模組內；之後其他模組也需要的話再提到 components/ui（共用檔，要先在群組說）。

import { type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const CONTROL_CLASS =
  "rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-ink disabled:cursor-not-allowed disabled:opacity-60";

function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-neutral-800">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="text-xs text-neutral-500">{hint}</p>
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
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error}>
      <select id={inputId} className={CONTROL_CLASS} aria-invalid={error ? true : undefined} {...props}>
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
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error}>
      <textarea
        id={inputId}
        rows={4}
        className={`${CONTROL_CLASS} resize-y leading-relaxed`}
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
