import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { StatusIndicator, type SessionProgress } from "@/components/ui/status-indicator";

// Figma「Class Card」25:1044：一張卡＝一個場次，整張卡是進入課程詳情的連結。
// 高度固定、課程名稱最多 2 行、價格不換行。首頁版不放「已報名 X/上限」、地址、退款規則。
export type ClassCardData = {
  href: string;
  coverUrl: string;
  sport: string;
  levelLabel: string;
  verified: boolean;
  title: string;
  /** 例：10/17 19:00–20:30 */
  timeText: string;
  /** 例：新北市・板橋體育館 */
  locationText: string;
  coachName: string;
  /** 一位小數；null＝尚無評價 */
  rating: number | null;
  pricePerPerson: number;
  progress: SessionProgress;
};

const TWD = new Intl.NumberFormat("zh-TW");

export function ClassCard({ card, className = "" }: { card: ClassCardData; className?: string }) {
  const full = card.progress.kind === "full";
  return (
    <Link
      href={card.href}
      className={`flex flex-col overflow-clip rounded-lg border border-border-default bg-brand-white transition hover:border-2 hover:border-brand-blue ${full ? "opacity-70" : ""} ${className}`}
    >
      <div className="relative h-[161px] w-full shrink-0 bg-tint-blue-100">
        <Image
          src={card.coverUrl}
          alt=""
          fill
          sizes="(min-width: 1200px) 308px, 358px"
          className="object-cover"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge type="neutral" className="shadow-sm">
            {card.sport}
          </Badge>
          <Badge type="neutral" className="border-transparent shadow-sm">
            {card.levelLabel}
          </Badge>
          {card.verified && (
            <Badge type="verified" className="shadow-sm">
              已認證
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-[var(--spacing-card-padding)] pb-[var(--spacing-card-padding)] pt-3.5">
        <h3 className="text-h3 line-clamp-2 h-[52px] text-text-primary">{card.title}</h3>
        <p className="text-body-small flex items-center gap-2 text-text-primary">
          <Icon name="calendar" className="size-4" />
          <span className="font-[family-name:var(--font-latin)] font-medium">{card.timeText}</span>
        </p>
        <p className="text-body-small flex items-center gap-2 text-text-primary">
          <Icon name="map-pin" className="size-4" />
          <span className="truncate">{card.locationText}</span>
        </p>
        <p className="text-body-small flex items-center gap-2 text-text-primary">
          <span className="truncate font-[family-name:var(--font-latin)] font-medium">
            {card.coachName}
          </span>
          <Icon name="star" className="size-3.5 shrink-0" />
          <span className="text-text-secondary">
            {card.rating === null ? "尚無評價" : card.rating.toFixed(1)}
          </span>
        </p>
        <div className="flex items-center gap-2 border-t border-border-default pt-3">
          <span className="text-h3 whitespace-nowrap text-text-primary">
            <span className="font-[family-name:var(--font-latin)] font-medium">
              NT${TWD.format(card.pricePerPerson)}
            </span>
          </span>
          <span className="flex-1" />
          <StatusIndicator progress={card.progress} />
        </div>
        <span
          className={`text-button flex h-10 items-center justify-center rounded-pill px-6 py-3 ${full ? "bg-state-disabled-bg text-state-disabled-text" : "bg-brand-blue text-text-inverse"}`}
        >
          {full ? "已額滿" : "報名"}
        </span>
      </div>
    </Link>
  );
}
