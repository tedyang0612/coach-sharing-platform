import { type ButtonHTMLAttributes } from "react";

// Figma「Chip」16:42：篩選／快捷晶片。選取＝淡藍底＋天空藍邊框；選取且按下＝天空藍底白字。
type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export function Chip({ selected = false, className = "", ...props }: ChipProps) {
  const style = selected
    ? "border-[1.5px] border-brand-blue bg-tint-blue-100 px-[15.5px] py-[7.5px] text-text-primary active:bg-brand-blue active:text-text-inverse disabled:border disabled:border-border-default disabled:bg-state-disabled-bg disabled:text-state-disabled-text"
    : "border border-border-default bg-brand-white px-4 py-2 text-text-primary active:bg-tint-blue-100 active:text-text-secondary disabled:bg-state-disabled-bg disabled:text-state-disabled-text";
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`text-label inline-flex items-center justify-center whitespace-nowrap rounded-pill transition disabled:cursor-not-allowed ${style} ${className}`}
      {...props}
    />
  );
}
