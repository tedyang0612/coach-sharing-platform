"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowLeftIcon } from "@/components/goland/icons";
import { LIST_HREF_KEY } from "@/lib/courses/listHref";

// 課程列表在 CourseGrid 把「/courses?篩選條件」記在 sessionStorage，這裡讀出來，
// 從詳情頁回去才不會丟掉篩選與排序。沒記到（直接開詳情頁、分享連結）就回沒有條件的列表。
function readListHref(): string {
  try {
    const saved = window.sessionStorage.getItem(LIST_HREF_KEY);
    // 只接受站內的列表網址，避免被塞進奇怪的連結
    return saved && /^\/courses(\?|$)/.test(saved) ? saved : "/courses";
  } catch {
    return "/courses";
  }
}

const subscribe = () => () => {};

export default function BackToResults() {
  // 伺服器端渲染與第一次水合都用 /courses，水合後 React 會改成記下的網址，不會有文字不一致
  const href = useSyncExternalStore(subscribe, readListHref, () => "/courses");
  return (
    <Link
      href={href}
      className="text-body-small flex items-center gap-1.5 text-(--color-text-secondary) hover:underline"
    >
      <ArrowLeftIcon size={18} />
      返回搜尋結果
    </Link>
  );
}
