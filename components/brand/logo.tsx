import Image from "next/image";
import logoFull from "./logo-full.svg";
import logoHorizontal from "./logo-horizontal.svg";

// 只能用設計提供的 SVG，不可修改、重畫、重新著色；只用高度控制尺寸，不拉伸變形。
// 橫式（285×58）給桌機導覽列；圓形 GO 版（124×56）給手機導覽列。
export function LogoHorizontal({ className = "" }: { className?: string }) {
  return <Image src={logoHorizontal} alt="夠練 GoLand" priority className={className} />;
}

export function LogoFull({ className = "" }: { className?: string }) {
  return <Image src={logoFull} alt="夠練 GoLand" priority className={className} />;
}
