import Image from "next/image";
import { type SelectHTMLAttributes } from "react";
import chevron from "./icons/chevron-down.svg";
import chevronMuted from "./icons/chevron-down-muted.svg";
import { FIELD_CLASSES } from "./field-styles";
import { FieldShell } from "./field-shell";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  /** 尚未選擇時顯示的提示文字（Figma：選擇地區） */
  placeholder?: string;
};

// Figma「Select」32:1084：原生 <select>（手機會用系統選單），右側 24px chevron。
export function Select({
  label,
  error,
  hint,
  placeholder,
  id,
  required,
  disabled,
  children,
  ...props
}: SelectProps) {
  const selectId = id ?? props.name;
  const empty = props.value === "" || (props.value === undefined && props.defaultValue === undefined);
  return (
    <FieldShell label={label} htmlFor={selectId} required={required} disabled={disabled} error={error} hint={hint}>
      <div className="relative">
        <select
          id={selectId}
          className={`${FIELD_CLASSES} appearance-none pr-12 ${empty ? "text-text-secondary" : ""}`}
          aria-invalid={error ? true : undefined}
          required={required}
          disabled={disabled}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {children}
        </select>
        <Image
          src={disabled ? chevronMuted : chevron}
          alt=""
          width={24}
          height={24}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
        />
      </div>
    </FieldShell>
  );
}
