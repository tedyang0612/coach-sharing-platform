import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BellIcon, MenuIcon, UserIcon } from "./icons";

export type NavActive = "explore" | "my-courses";

// 全域導覽列（設計稿 Global Navigation）：桌機（lg 以上）與手機兩種版面，
// 各有訪客與已登入兩種內容，共四種靜態變體。
// 還沒做（下一輪）：手機的側邊選單（Drawer）、頭像的帳號選單、鈴鐺的未讀小點、
// 教練身分的變體（沒有「成為教練」、頭像選單有教練工作台）。
// 連結目的地：成為教練 /coach/apply 與鈴鐺 /notifications 是牛牛的頁面，合併前點不開。

const DESKTOP_LINK = "text-body relative py-2 text-(--color-text-primary)";
const GHOST_BUTTON =
  "text-button rounded-full px-4 py-2 text-(--color-text-primary) hover:bg-(--color-tint-blue-100)";
const PRIMARY_BUTTON =
  "text-button rounded-full bg-(--color-brand-blue) px-6 py-2.5 text-(--color-text-inverse) hover:bg-(--color-brand-blue-pressed)";
const SECONDARY_BUTTON =
  "text-button rounded-full border border-(--color-brand-blue) bg-(--color-surface-default) px-5 py-2.5 text-(--color-text-primary) hover:bg-(--color-tint-blue-100)";

function NavItem({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${DESKTOP_LINK} ${active ? "font-bold" : ""}`}
    >
      {children}
      {active && (
        <span className="absolute -bottom-3 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-full bg-(--color-brand-blue)" />
      )}
    </Link>
  );
}

function Avatar() {
  // 帳號選單下一輪再做，先放圓形頭像
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-(--color-tint-blue-200) text-(--color-text-primary)"
    >
      <UserIcon size={20} />
    </span>
  );
}

export default async function GlobalNav({ active }: { active?: NavActive }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const loggedIn = Boolean(user);

  return (
    <header className="border-b border-(--color-border-default) bg-(--color-surface-default)">
      {/* 桌機 1440×72：Logo、探索課程、我的課程（登入後），右邊依登入狀態 */}
      <div className="hidden h-[72px] items-center gap-8 pl-[calc(var(--spacing-screen-padding)-25px)] pr-(--spacing-screen-padding) lg:flex">
        <Link href="/courses" aria-label="夠練 GoLand 首頁">
          {/* Logo 只能用交接包提供的 SVG，不可修改、重畫或重新著色 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/goland/logo-horizontal.svg" alt="夠練 GoLand" className="h-[58px] w-auto" />
        </Link>
        <nav aria-label="主選單" className="flex items-center gap-8">
          <NavItem href="/courses" active={active === "explore"}>
            探索課程
          </NavItem>
          {loggedIn && (
            <NavItem href="/my-courses" active={active === "my-courses"}>
              我的課程
            </NavItem>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {loggedIn ? (
            <>
              <Link href="/coach/apply" className={SECONDARY_BUTTON}>
                成為教練
              </Link>
              <Link
                href="/notifications"
                aria-label="通知"
                className="flex h-10 w-10 items-center justify-center rounded-full text-(--color-text-primary) hover:bg-(--color-tint-blue-100)"
              >
                <BellIcon size={22} />
              </Link>
              <Avatar />
            </>
          ) : (
            <>
              <Link href="/login" className={GHOST_BUTTON}>
                登入
              </Link>
              <Link href="/register" className={PRIMARY_BUTTON}>
                註冊
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 手機 390×64：Logo、彈性空白；訪客是「登入」加選單，登入後是鈴鐺加選單 */}
      <div className="flex h-16 items-center gap-3 px-4 lg:hidden">
        <Link href="/courses" aria-label="夠練 GoLand 首頁">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/goland/logo-full.svg" alt="夠練 GoLand" className="h-11 w-auto" />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {loggedIn ? (
            <Link
              href="/notifications"
              aria-label="通知"
              className="flex h-10 w-10 items-center justify-center rounded-full text-(--color-text-primary)"
            >
              <BellIcon size={22} />
            </Link>
          ) : (
            <Link href="/login" className={PRIMARY_BUTTON}>
              登入
            </Link>
          )}
          {/* 側邊選單（Drawer）下一輪再做，目前只放圖示，沒有動作 */}
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center text-(--color-text-primary)">
            <MenuIcon size={24} />
          </span>
        </div>
      </div>
    </header>
  );
}
