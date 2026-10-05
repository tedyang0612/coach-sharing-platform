import { type HTMLAttributes } from "react";

// Figma「Badge」16:51：小標籤。螢光綠只給 Popular／Group（小面積強調）。
// 文案由呼叫端傳入（熱門／開課／初階／運動／已認證…）。
type BadgeType = "popular" | "group" | "info" | "neutral" | "verified";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  type?: BadgeType;
};

const TYPE_CLASSES: Record<BadgeType, string> = {
  popular: "bg-brand-lime",
  group: "bg-brand-lime",
  info: "bg-tint-blue-100",
  verified: "bg-tint-blue-100",
  neutral: "border border-border-default bg-brand-white",
};

export function Badge({ type = "popular", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`text-caption inline-flex items-center justify-center whitespace-nowrap rounded-pill px-2 py-1 text-text-primary ${TYPE_CLASSES[type]} ${className}`}
      {...props}
    />
  );
}
