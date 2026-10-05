import { type TextareaHTMLAttributes } from "react";
import { FIELD_CLASSES } from "./field-styles";
import { FieldShell } from "./field-shell";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
};

// Figma「Textarea」32:1107：預設高 96px，可往下拉長。
export function Textarea({ label, error, hint, id, required, disabled, ...props }: TextareaProps) {
  const textareaId = id ?? props.name;
  return (
    <FieldShell label={label} htmlFor={textareaId} required={required} disabled={disabled} error={error} hint={hint}>
      <textarea
        id={textareaId}
        className={`${FIELD_CLASSES} min-h-24 resize-y`}
        aria-invalid={error ? true : undefined}
        required={required}
        disabled={disabled}
        {...props}
      />
    </FieldShell>
  );
}
