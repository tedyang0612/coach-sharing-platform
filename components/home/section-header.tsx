import Link from "next/link";
import { Icon } from "@/components/ui/icon";

// 首頁各區塊的標題列：標題＋副標，右側可選「查看更多」連結。
export function SectionHeader({
  title,
  subtitle,
  moreHref,
  moreLabel,
}: {
  title: string;
  subtitle: string;
  moreHref?: string;
  moreLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-h2 text-text-primary">{title}</h2>
        <p className="text-body-small mt-1 text-text-secondary">{subtitle}</p>
      </div>
      {moreHref && (
        <Link
          href={moreHref}
          className="text-body-small flex shrink-0 items-center gap-1 text-text-primary"
        >
          {moreLabel}
          <Icon name="arrow-right" className="size-4" />
        </Link>
      )}
    </div>
  );
}
