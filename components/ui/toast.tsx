"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";

// Toast 操作回饋（Figma 第六頁「Toast（操作回饋）」598:10332；示範畫面桌機 598:10333…、手機 598:10558…）。
// 三種：成功（登出成功、報名成功、取消報名成功）、資訊、錯誤。
// - 位置：頁面上方置中，導覽列下方 16（手機 12，寬 358）；進場由上滑入＋淡入約 200ms
// - 停留：成功／資訊 4 秒、錯誤 6 秒自動消失；可按 × 關閉；滑鼠停留、鍵盤焦點在上面或手指按住時暫停計時
// - 同時只顯示一則，新的取代舊的
//
// 用法：
// - 瀏覽器端（事件處理函式裡）：toast.success("已取消報名")、toast.info(...)、toast.error(...)
// - Server Action 之後導頁才要顯示的：導向的網址加 ?toast=<代碼>（見 TOAST_FROM_URL），
//   ToastViewport 讀到後顯示並把參數從網址拿掉；只認白名單內的代碼，網址上不能塞任意文字。

export type ToastType = "success" | "info" | "error";

type ToastItem = { id: number; type: ToastType; message: string };

const DURATION_MS: Record<ToastType, number> = { success: 4000, info: 4000, error: 6000 };

/** 網址 ?toast=<代碼> 對應的訊息（白名單）。 */
export const TOAST_FROM_URL: Record<string, { type: ToastType; message: string }> = {
  logout: { type: "success", message: "你已登出" },
  registered: { type: "success", message: "報名成功！確定開課後才會扣款" },
  cancelled: { type: "success", message: "已取消報名" },
};

// 模組層級的小 store：任何地方都能呼叫 toast.xxx()，不需要 Provider 包住整棵樹。
let current: ToastItem | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function showToast(type: ToastType, message: string) {
  current = { id: nextId++, type, message };
  emit();
}

export const toast = {
  success: (message: string) => showToast("success", message),
  info: (message: string) => showToast("info", message),
  error: (message: string) => showToast("error", message),
};

function dismiss(id: number) {
  if (current?.id !== id) return;
  current = null;
  emit();
}

const STYLES: Record<ToastType, { box: string; text: string; icon: string; close: string }> = {
  success: {
    box: "border border-border-default bg-brand-white",
    text: "text-text-primary",
    icon: "bg-brand-lime text-text-primary",
    close: "text-text-primary",
  },
  info: {
    box: "border border-brand-blue bg-tint-blue-100",
    text: "text-text-primary",
    icon: "bg-brand-blue text-text-inverse",
    close: "text-text-primary",
  },
  error: {
    box: "border-[1.5px] border-state-error bg-state-error-bg",
    text: "text-state-error-text",
    icon: "bg-state-error text-text-inverse",
    close: "text-state-error-text",
  },
};

function TypeIcon({ type }: { type: ToastType }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (type === "success") {
    return (
      <svg {...common}>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    );
  }
  if (type === "info") {
    return (
      <svg {...common}>
        <path d="M12 11v6" />
        <path d="M12 7h.01" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 6.5v7" />
      <path d="M12 17.5h.01" />
    </svg>
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const style = STYLES[item.type];
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const remaining = useRef(DURATION_MS[item.type]);

  // 進場：由上滑入＋淡入 200ms（使用者設定減少動態時不做動畫）
  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    element.animate(
      [
        { opacity: 0, transform: "translateY(-12px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 200, easing: "ease-out" },
    );
  }, []);

  // 自動消失：暫停時停止計時，離開後用剩下的時間繼續
  useEffect(() => {
    if (paused) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => dismiss(item.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [paused, item.id]);

  return (
    <div
      ref={ref}
      role={item.type === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onTouchCancel={() => setPaused(false)}
      className={`pointer-events-auto flex w-full max-w-[358px] items-center gap-2 rounded-pill py-3 pl-4 pr-5 shadow-md md:w-auto md:max-w-[560px] ${style.box}`}
    >
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-pill ${style.icon}`}>
        <TypeIcon type={item.type} />
      </span>
      <p className={`text-label min-w-0 flex-1 ${style.text}`}>{item.message}</p>
      <button
        type="button"
        aria-label="關閉"
        onClick={() => dismiss(item.id)}
        className={`flex size-6 shrink-0 items-center justify-center rounded-pill ${style.close}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

/** 讀網址的 ?toast=<代碼>，顯示對應訊息後把參數從網址拿掉（不留在瀏覽紀錄與分享連結裡）。 */
function ToastFromUrl() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const code = searchParams.get("toast");

  useEffect(() => {
    if (!code) return;
    const entry = TOAST_FROM_URL[code];
    if (entry) showToast(entry.type, entry.message);
    const url = new URL(window.location.href);
    url.searchParams.delete("toast");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [code, pathname]);

  return null;
}

/** 放在 app/layout.tsx，全站只要一個。 */
export function ToastViewport() {
  const item = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );

  return (
    <>
      <Suspense fallback={null}>
        <ToastFromUrl />
      </Suspense>
      {/* 導覽列下方：桌機導覽列高 72 ＋ 16、手機高 64 ＋ 12 */}
      <div className="pointer-events-none fixed inset-x-0 top-[76px] z-50 flex justify-center px-4 md:top-[88px]">
        {item && <ToastCard key={item.id} item={item} />}
      </div>
    </>
  );
}
