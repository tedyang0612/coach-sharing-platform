import { type InputHTMLAttributes } from "react";

type CheckboxFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function CheckboxField({ label, id, ...props }: CheckboxFieldProps) {
  const inputId = id ?? props.name;
  return (
    <label htmlFor={inputId} className="flex items-center gap-2 text-sm text-neutral-600">
      <input
        id={inputId}
        type="checkbox"
        className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
        {...props}
      />
      {label}
    </label>
  );
}
