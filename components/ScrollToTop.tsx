"use client";

import { useEffect, useState } from "react";

// 回到頂端：列表用「載入更多」一直往下長卡片，往下捲一段之後，右下角出現一顆固定的按鈕（QA 建議）。
// 往下捲超過約一個畫面才顯示，點了平滑捲回頂端；使用者偏好減少動態時直接跳到頂端。
export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  function toTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="回到頂端"
      className="fixed bottom-6 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-(--color-brand-blue) text-(--color-text-inverse) shadow-(--shadow-md) transition hover:bg-(--color-brand-blue-pressed) sm:right-6"
    >
      {/* 向上箭頭：取自設計師交接包 assets/icons 的 arrow-left 風格（24px、2px 線條），旋轉成朝上 */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5M5 12L12 5L19 12" />
      </svg>
    </button>
  );
}
