import Image from "next/image";
import { type InputHTMLAttributes } from "react";
import radio from "./icons/radio.svg";
import radioDisabled from "./icons/radio-disabled.svg";
import radioSelected from "./icons/radio-selected.svg";
import radioSelectedDisabled from "./icons/radio-selected-disabled.svg";

type RadioFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

// Figma「Radio」32:1171：四張圖（未選／已選／未選停用／已選停用），用 peer 狀態切換。
// 原生 input 保留（sr-only）以維持表單送出、群組與鍵盤操作。
export function RadioField({ label, id, className = "", ...props }: RadioFieldProps) {
  const inputId = id ?? (props.name && props.value !== undefined ? `${props.name}-${props.value}` : undefined);
  const icon = "col-start-1 row-start-1 hidden";
  return (
    <label
      htmlFor={inputId}
      className={`text-body flex items-center gap-3 text-text-primary has-[:disabled]:text-state-disabled-text ${className}`}
    >
      <input id={inputId} type="radio" className="peer sr-only" {...props} />
      <span className="grid size-6 shrink-0 rounded-pill peer-focus-visible:ring-2 peer-focus-visible:ring-brand-blue peer-focus-visible:ring-offset-2 peer-[:not(:checked):not(:disabled)]:[&>.off]:block peer-checked:[&>.on]:block peer-checked:peer-disabled:[&>.on]:hidden peer-checked:peer-disabled:[&>.on-disabled]:block peer-[:not(:checked):disabled]:[&>.off-disabled]:block">
        <Image src={radio} alt="" width={24} height={24} className={`off ${icon}`} />
        <Image src={radioSelected} alt="" width={24} height={24} className={`on ${icon}`} />
        <Image src={radioDisabled} alt="" width={24} height={24} className={`off-disabled ${icon}`} />
        <Image src={radioSelectedDisabled} alt="" width={24} height={24} className={`on-disabled ${icon}`} />
      </span>
      <span>{label}</span>
    </label>
  );
}
