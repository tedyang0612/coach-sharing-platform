import Image from "next/image";
import { type ButtonHTMLAttributes } from "react";
import spinnerDeep from "./icons/spinner-deep.svg";
import spinnerWhite from "./icons/spinner-white.svg";

// Figma「Button」16:29：Primary／Secondary／Ghost × Default／Pressed／Disabled／Loading。
// Pressed 用 :active、Disabled 用 disabled 屬性；Loading 由 loading prop 控制（文案自行傳入）。
type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  /** 載入中顯示的文案，Figma 為「處理中」 */
  loadingText?: string;
  fullWidth?: boolean;
};

// 停用樣式獨立一組：Loading 雖然 disabled，但 Figma 上維持原本顏色，不套停用樣式。
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand-blue text-text-inverse active:bg-brand-blue-pressed",
  secondary:
    "border-[1.5px] border-brand-blue bg-brand-white text-brand-deep active:bg-tint-blue-100",
  ghost: "bg-transparent text-brand-deep active:bg-tint-blue-100",
};

const DISABLED_CLASSES: Record<ButtonVariant, string> = {
  primary: "disabled:bg-state-disabled-bg disabled:text-state-disabled-text",
  secondary:
    "disabled:border-transparent disabled:bg-state-disabled-bg disabled:text-state-disabled-text",
  ghost: "disabled:bg-transparent disabled:text-state-disabled-text",
};

/** 給 <Link> 等非 <button> 元素套用同一套按鈕外觀（導覽列的「登入」「註冊」「成為教練」）。 */
export function buttonClassName(variant: ButtonVariant = "primary", fullWidth = false) {
  return `text-button inline-flex h-11 items-center justify-center gap-2 rounded-pill px-6 py-3 transition ${fullWidth ? "w-full" : ""} ${VARIANT_CLASSES[variant]}`;
}

export function Button({
  variant = "primary",
  loading = false,
  loadingText = "處理中",
  fullWidth = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const spinner = variant === "primary" ? spinnerWhite : spinnerDeep;
  return (
    <button
      className={`text-button inline-flex h-11 items-center justify-center gap-2 rounded-pill px-6 py-3 transition disabled:cursor-not-allowed ${fullWidth ? "w-full" : ""} ${VARIANT_CLASSES[variant]} ${loading ? "" : DISABLED_CLASSES[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Image src={spinner} alt="" width={16} height={16} className="animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
