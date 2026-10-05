"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CheckIcon, ShareIcon } from "@/components/goland/icons";
import { buildShareUrl } from "@/lib/share/shareUrl";

interface Props {
  // 要分享的路徑，例如 "/courses/abc"；沒給就用目前頁面的路徑
  path?: string;
  // 系統分享選單用的標題與說明
  title?: string;
  text?: string;
  // 設計稿 S05 的分享鈕是 44px 圓形、只有圖示；成功時旁邊才出現「連結已複製」
  iconOnly?: boolean;
}

type Status = "idle" | "copied" | "failed";

const noopSubscribe = () => () => {};

// 手機（觸控裝置）且瀏覽器支援系統分享選單才顯示第二顆按鈕
function detectNativeShare() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

// 舊瀏覽器或非 HTTPS 環境沒有 navigator.clipboard，退回 execCommand
function legacyCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

// 樣式用設計 token（--color-*），要放在 <GolandTheme> 裡才有值。
export default function ShareButton({ path, title, text, iconOnly = false }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [url, setUrl] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canNativeShare = useSyncExternalStore(
    noopSubscribe,
    detectNativeShare,
    () => false,
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function currentShareUrl() {
    return buildShareUrl(window.location.origin, path ?? window.location.pathname);
  }

  function showStatus(next: Status) {
    setStatus(next);
    if (timer.current) clearTimeout(timer.current);
    // 複製失敗要讓使用者有時間手動複製，所以不自動消失
    if (next === "copied") {
      timer.current = setTimeout(() => setStatus("idle"), 2000);
    }
  }

  async function copyLink() {
    const shareUrl = currentShareUrl();
    setUrl(shareUrl);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else if (!legacyCopy(shareUrl)) {
        throw new Error("copy failed");
      }
      showStatus("copied");
    } catch {
      showStatus("failed");
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text, url: currentShareUrl() });
    } catch {
      // 使用者關閉分享選單會丟 AbortError，不用當成錯誤
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {iconOnly ? (
          <>
            <button
              type="button"
              onClick={copyLink}
              aria-label="分享連結"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-(--color-border-default) bg-(--color-surface-default) text-(--color-text-primary) hover:bg-(--color-tint-blue-100)"
            >
              {status === "copied" ? <CheckIcon size={20} /> : <ShareIcon size={20} />}
            </button>
            {status === "copied" && (
              <span role="status" className="text-body-small text-(--color-text-secondary)">
                連結已複製
              </span>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={copyLink}
            className="text-button inline-flex items-center gap-2 rounded-full border border-(--color-brand-blue) bg-(--color-surface-default) px-4 py-2 text-(--color-text-primary) hover:bg-(--color-tint-blue-100)"
          >
            {status === "copied" ? <CheckIcon size={16} /> : <ShareIcon size={16} />}
            {status === "copied" ? "連結已複製" : "分享"}
          </button>
        )}
        {canNativeShare && (
          <button
            type="button"
            onClick={nativeShare}
            className="text-body-small rounded-full border border-(--color-border-default) bg-(--color-surface-default) px-4 py-2 text-(--color-text-primary) hover:bg-(--color-tint-blue-100)"
          >
            用其他 App 分享
          </button>
        )}
      </div>

      <div aria-live="polite">
        {status === "failed" && (
          <label className="text-body-small block text-(--color-text-primary)">
            無法自動複製，請手動複製下方連結：
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-1 w-full rounded-(--radius-md) border border-(--color-border-default) bg-(--color-surface-default) px-3 py-2"
            />
          </label>
        )}
      </div>
    </div>
  );
}
