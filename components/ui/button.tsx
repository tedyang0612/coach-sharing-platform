import { type ButtonHTMLAttributes } from "react";

/**
 * 共用主按鈕。顏色走 globals.css 的 --color-brand token，
 * 之沛定案品牌色之後只要改那個變數值，這裡不用動。
 */
export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    />
  );
}
