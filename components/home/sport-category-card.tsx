import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

// Figma「Sport Category Card」17:55：照片＋運動名稱（1 行）＋箭頭。照片一律裁成同一比例。
export type SportCategory = { name: string; image: string };

export function SportCategoryCard({
  sport,
  href,
  className = "",
}: {
  sport: SportCategory;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative block aspect-[3/4] overflow-clip rounded-lg bg-tint-blue-200 ${className}`}
    >
      <Image
        src={sport.image}
        alt=""
        fill
        sizes="(min-width: 1200px) 150px, 140px"
        className="object-cover"
      />
      <span className="text-h3 absolute bottom-2 left-2 flex h-9 items-center rounded-[18px] bg-brand-white px-3.5 py-1 text-text-primary">
        {sport.name}
      </span>
      <span className="absolute bottom-2 right-2 flex size-9 items-center justify-center rounded-[18px] bg-brand-white text-text-primary shadow-sm transition group-hover:bg-tint-blue-100">
        <Icon name="arrow-right" className="size-5" />
      </span>
    </Link>
  );
}
