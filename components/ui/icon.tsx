import { type CSSProperties } from "react";
import arrowRight from "./icons/line/arrow-right.svg";
import award from "./icons/line/award.svg";
import bell from "./icons/line/bell.svg";
import calendar from "./icons/line/calendar.svg";
import chevronDown from "./icons/line/chevron-down.svg";
import logOut from "./icons/line/log-out.svg";
import mapPin from "./icons/line/map-pin.svg";
import menu from "./icons/line/menu.svg";
import plus from "./icons/line/plus.svg";
import star from "./icons/line/star.svg";
import user from "./icons/line/user.svg";

// 線條圖示（design/assets/icons，24×24，stroke 為 currentColor）。
// 用 CSS mask 畫，顏色跟著文字色走（預設 text-text-primary），不用寫死色碼。
const ICONS = {
  "arrow-right": arrowRight,
  award,
  bell,
  calendar,
  "chevron-down": chevronDown,
  "log-out": logOut,
  "map-pin": mapPin,
  menu,
  plus,
  star,
  user,
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const url = `url(${ICONS[name].src})`;
  const style: CSSProperties = { maskImage: url, WebkitMaskImage: url };
  return (
    <span
      aria-hidden
      className={`inline-block ${/(^| )size-/.test(className) ? "" : "size-6"} shrink-0 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] ${className}`}
      style={style}
    />
  );
}
