"use client";

import { useEffect, useRef, useState } from "react";
import { FIELD_CLASSES } from "@/components/ui/field-styles";
import { Icon } from "@/components/ui/icon";
import {
  SOCIAL_PLATFORMS,
  type SocialAccount,
  type SocialPlatform,
} from "@/lib/coach-application/social";
import { SocialIcon } from "./social-icon";

type SocialAccountFieldProps = {
  value: SocialAccount;
  onChange: (next: SocialAccount) => void;
};

/**
 * 社群帳號：左邊用圖示選平台（Instagram／Facebook／YouTube），右邊填帳號。
 * 原生 <select> 的選項放不了圖示，所以平台選單是自己做的下拉；
 * 選項只顯示圖示，平台名稱放在 aria-label 與 title，螢幕閱讀器與滑鼠停留時仍讀得到。
 */
export function SocialAccountField({ value, onChange }: SocialAccountFieldProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 點選單以外的地方或按 Esc 就收起來
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(platform: SocialPlatform) {
    onChange({ ...value, platform });
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="contactSocial" className="text-label text-text-primary">
        社群帳號
      </label>
      <div className="flex gap-2">
        <div ref={rootRef} className="relative shrink-0">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={`社群平台：${value.platform}`}
            title={value.platform}
            onClick={() => setOpen((current) => !current)}
            className="flex h-full min-h-11 items-center gap-1.5 rounded-md border border-border-default bg-brand-white px-3 text-text-primary transition focus-visible:border-2 focus-visible:border-brand-blue focus-visible:outline-none"
          >
            <SocialIcon platform={value.platform} />
            <Icon name="chevron-down" className={`size-4 transition ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <ul
              role="listbox"
              aria-label="社群平台"
              className="absolute left-0 top-full z-20 mt-1 flex flex-col gap-1 rounded-md border border-border-default bg-brand-white p-1 shadow-lg"
            >
              {SOCIAL_PLATFORMS.map((platform) => {
                const selected = platform === value.platform;
                return (
                  <li key={platform} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      aria-label={platform}
                      title={platform}
                      onClick={() => choose(platform)}
                      className={`flex size-10 items-center justify-center rounded-md text-text-primary transition hover:bg-tint-blue-100 focus-visible:outline-2 focus-visible:outline-brand-blue ${
                        selected ? "bg-tint-blue-200" : ""
                      }`}
                    >
                      <SocialIcon platform={platform} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <input
          id="contactSocial"
          name="contactSocial"
          value={value.account}
          placeholder={`請輸入 ${value.platform} 帳號`}
          onChange={(event) => onChange({ ...value, account: event.target.value })}
          className={`${FIELD_CLASSES} min-w-0 flex-1`}
        />
      </div>
    </div>
  );
}
