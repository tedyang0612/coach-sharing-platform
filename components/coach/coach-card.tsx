import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import verifiedBadge from "./verified-badge.svg";

// Figma「Coach Card」62:806：公開教練卡（PRD 9.0）。照片＋已認證圖示＋評價＋名稱＋運動＋特色 Tag＋招生中課程數。
// 不放任何聯絡資訊；深藍漸層是唯一遮罩，文字一律白色。
export type CoachCardData = {
  href: string;
  photoUrl: string;
  name: string;
  /** 一位小數；null＝尚無評價 */
  rating: number | null;
  sports: string[];
  tags: string[];
  openCourseCount: number;
};

export function CoachCard({ coach, className = "" }: { coach: CoachCardData; className?: string }) {
  return (
    <Link
      href={coach.href}
      className={`relative block h-[380px] overflow-clip rounded-lg bg-tint-blue-200 ${className}`}
    >
      <Image
        src={coach.photoUrl}
        alt=""
        fill
        sizes="(min-width: 1200px) 243px, 280px"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-b from-brand-deep/0 from-50% via-brand-deep/40 via-65% to-brand-deep/95 to-90%" />
      <Image
        src={verifiedBadge}
        alt="已認證"
        width={44}
        height={54}
        className="absolute right-4 top-3.5"
      />
      <div className="absolute inset-x-4 bottom-4 flex flex-col items-start gap-1 text-text-inverse">
        <span className="flex items-center gap-1 font-[family-name:var(--font-latin)] text-[13px] font-medium leading-4">
          <Icon name="star" className="size-3.5" />
          {coach.rating === null ? <span className="font-[family-name:var(--font-cjk)]">尚無評價</span> : coach.rating.toFixed(1)}
        </span>
        <span className="text-h2 font-[family-name:var(--font-latin)] font-medium">{coach.name}</span>
        <span className="text-body-small">{coach.sports.join("・")}</span>
        {coach.tags.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {coach.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-pill bg-brand-white/18 px-2 py-px text-[11px] leading-[14px]"
              >
                {tag}
              </span>
            ))}
          </span>
        )}
        <span className="flex w-full items-center gap-2">
          <span className="text-caption font-medium">
            招生中{" "}
            <span className="font-[family-name:var(--font-latin)]">{coach.openCourseCount}</span> 堂課
          </span>
          <span className="flex-1" />
          <span className="flex size-7 items-center justify-center rounded-pill bg-brand-white text-text-primary">
            <Icon name="arrow-right" className="size-4" />
          </span>
        </span>
      </div>
    </Link>
  );
}
