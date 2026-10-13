"use client";

import Image from "next/image";
import { Icon } from "@/components/ui/icon";

/**
 * 頂部橫幅的大頭像（1013 補充）：只保留圓形外框＋人像圖示，不放「＋」更換鈕；
 * 更換照片只在下方「基本資料」卡裡的「更換照片」按鈕（見 profile-form.tsx）。
 * 有照片就顯示照片。桌機 201×201、手機 104×104。
 */
export function HeroAvatar({ avatarUrl }: { avatarUrl: string | null }) {
  return (
    <span className="relative flex size-[104px] shrink-0 items-center justify-center rounded-pill border-4 border-brand-blue bg-brand-white p-1 md:size-[201px] md:border-[6px] md:p-1.5">
      <span className="relative flex size-full items-center justify-center overflow-hidden rounded-pill bg-tint-blue-200 text-text-primary">
        {avatarUrl ? (
          <Image src={avatarUrl} alt="我的頭像" fill sizes="201px" className="object-cover" />
        ) : (
          <Icon name="user" className="size-12 md:size-24" />
        )}
      </span>
    </span>
  );
}
