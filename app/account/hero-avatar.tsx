"use client";

import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import { AvatarPicker } from "./avatar-picker";

/** 頂部橫幅的大頭像：有照片就顯示照片，沒有就是預設人像；右下角的「＋」可以更換照片。 */
export function HeroAvatar({ userId, avatarUrl }: { userId: string; avatarUrl: string | null }) {
  return (
    <AvatarPicker userId={userId} avatarUrl={avatarUrl}>
      {({ open, busy, error }) => (
        <div className="flex shrink-0 flex-col items-start gap-2">
          <span className="relative flex size-[110px] items-center justify-center rounded-pill border-4 border-brand-blue bg-tint-blue-200 text-text-primary md:size-[226px] md:border-[6px]">
            <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-pill">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="我的頭像" fill sizes="226px" className="object-cover" />
              ) : (
                <Icon name="user" className="size-12 md:size-24" />
              )}
            </span>
            <button
              type="button"
              onClick={open}
              disabled={busy}
              aria-label="更換照片"
              title="更換照片"
              className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-pill border-2 border-text-primary bg-brand-lime text-text-primary transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60 md:size-14"
            >
              <Icon name="plus" className="size-4 md:size-7" />
            </button>
          </span>
          {busy && <p role="status" className="text-caption text-text-primary">上傳中…</p>}
          {error && (
            <p role="alert" className="text-caption text-state-error-text">
              {error}
            </p>
          )}
        </div>
      )}
    </AvatarPicker>
  );
}
