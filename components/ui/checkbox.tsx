import Image from "next/image";
import { type InputHTMLAttributes } from "react";
import checkMuted from "./icons/check-muted.svg";
import checkWhite from "./icons/check-white.svg";

type CheckboxFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Figma Error 狀態：紅框＋紅字 */
  invalid?: boolean;
};

/**
 * Figma「Checkbox」32:1152：24px 方框，未勾＝天空藍框、勾選＝深藍底白勾、錯誤＝紅框、停用＝灰底。
 * 原生 input 保留（sr-only）以維持表單送出與鍵盤操作，方框用 peer 樣式畫。
 */
export function CheckboxField({ label, id, invalid, className = "", ...props }: CheckboxFieldProps) {
  const inputId = id ?? props.name;
  return (
    <label
      htmlFor={inputId}
      className={`text-body flex items-start gap-3 ${invalid ? "text-state-error-text" : "text-text-primary"} has-[:disabled]:text-state-disabled-text ${className}`}
    >
      <input id={inputId} type="checkbox" className="peer sr-only" {...props} />
      <span
        className={`relative size-6 shrink-0 overflow-clip rounded-sm bg-brand-white transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-blue peer-focus-visible:ring-offset-2 peer-checked:border-brand-deep peer-checked:bg-brand-deep peer-disabled:border-border-default peer-disabled:bg-state-disabled-bg peer-checked:[&>img.on]:block peer-checked:peer-disabled:[&>img.on]:hidden peer-checked:peer-disabled:[&>img.off]:block ${invalid ? "border-2 border-state-error" : "border-[1.5px] border-brand-blue"}`}
      >
        <Image src={checkWhite} alt="" width={16} height={16} className="on absolute left-[2.5px] top-[2.5px] hidden" />
        <Image src={checkMuted} alt="" width={16} height={16} className="off absolute left-[2.5px] top-[2.5px] hidden" />
      </span>
      <span>{label}</span>
    </label>
  );
}
