import type { ReactNode } from "react";
import {
  CalendarIcon,
  MapPinIcon,
  TagIcon,
  UsersIcon,
} from "@/components/goland/icons";

interface Item {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}

// 日期、地點、費用、人數四項資訊。
// 手機：白色卡片，圖示在左、標籤與內容在右，由上往下排；
// 桌機：一整條四欄，每欄標籤（含小圖示）在上、內容在下，置中。
export default function KeyInfoStrip({
  dateText,
  venue,
  address,
  price,
  minToOpen,
  capacity,
}: {
  dateText: string;
  venue: string;
  address: string;
  price: number;
  minToOpen: number;
  capacity: number;
}) {
  const items: Item[] = [
    { icon: <CalendarIcon size={24} />, label: "日期與時間", value: dateText },
    {
      icon: <MapPinIcon size={24} />,
      label: "上課地點",
      value: (
        <>
          {venue}
          <br className="max-md:hidden" />
          <span className="md:hidden">｜</span>
          {address}
        </>
      ),
    },
    { icon: <TagIcon size={24} />, label: "費用", value: `NT$${price.toLocaleString()} / 人` },
    {
      icon: <UsersIcon size={24} />,
      label: "人數",
      value: `最少 ${minToOpen} 人開課，最多 ${capacity} 人`,
    },
  ];

  return (
    <dl className="grid grid-cols-1 gap-3.5 rounded-(--radius-lg) border border-(--color-border-default) bg-(--color-surface-default) p-4 md:grid-cols-4 md:gap-6 md:p-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-start gap-3 md:flex-col md:items-center md:gap-1 md:text-center"
        >
          <span className="text-(--color-text-primary) md:hidden">{item.icon}</span>
          <div className="space-y-0.5">
            <dt className="text-caption flex items-center gap-1.5 text-(--color-text-secondary) md:justify-center">
              <span className="max-md:hidden">
                {/* 桌機的圖示縮小成標籤旁的小圖示 */}
                {item.label === "日期與時間" && <CalendarIcon size={16} />}
                {item.label === "上課地點" && <MapPinIcon size={16} />}
                {item.label === "費用" && <TagIcon size={16} />}
                {item.label === "人數" && <UsersIcon size={16} />}
              </span>
              {item.label}
            </dt>
            <dd className="text-body text-(--color-text-primary)">{item.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
