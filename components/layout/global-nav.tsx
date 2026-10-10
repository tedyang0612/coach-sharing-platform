"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/actions/auth";
import { LogoFull, LogoHorizontal } from "@/components/brand/logo";
import { buttonClassName } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";

// 導覽連結目的地：對齊各模組既有路由（小柔 /courses、/my-courses；牛牛 /notifications、/become-coach；教練工作台入口是總覽 /coach（再用工作台上方分頁切到課程管理等））。
// 「我的帳戶」：學員身分連到 /account（頁面另外做）；教練身分連到教練資料管理 /coach/profile（牛牛的 C08）。
const ROUTES = {
  explore: "/courses",
  myCourses: "/my-courses",
  notifications: "/notifications",
  account: "/account",
  coachAccount: "/coach/profile",
  becomeCoach: "/become-coach",
  coachWorkspace: "/coach",
  coachCourses: "/coach/courses",
  login: "/login",
  register: "/register",
} as const;

export type NavAuth = "guest" | "user" | "coach";
type NavActive = "explore" | "my-courses" | "coach-courses";

type GlobalNavProps = {
  auth: NavAuth;
  /** 不傳就依目前網址判斷 */
  active?: NavActive;
};

// Figma「Global Navigation」Desktop 23:719／Mobile 24:1046／Drawer 24:1099／Account Menu 24:871。
// 全站同一個結構（教練工作台也一樣）；「成為教練」只給非教練，教練的「教練工作台」收在帳戶選單裡。
export function GlobalNav({ auth, active }: GlobalNavProps) {
  const pathname = usePathname();
  const current: NavActive | undefined =
    active ??
    (pathname.startsWith(ROUTES.explore)
      ? "explore"
      : pathname.startsWith(ROUTES.myCourses)
        ? "my-courses"
        : pathname.startsWith(ROUTES.coachCourses)
          ? "coach-courses"
          : undefined);
  const loggedIn = auth !== "guest";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const closeAll = () => {
    setDrawerOpen(false);
    setAccountOpen(false);
  };

  return (
    <header className="relative border-b border-border-default bg-brand-white">
      {/* 桌機 */}
      <div className="hidden h-[72px] items-center gap-8 pr-[var(--spacing-screen-padding)] pl-[calc(var(--spacing-screen-padding)-25px)] md:flex">
        <Link href="/" aria-label="夠練 GoLand 首頁" className="shrink-0">
          <LogoHorizontal className="h-auto w-[288px]" />
        </Link>
        <DesktopNavItem href={ROUTES.explore} active={current === "explore"}>
          探索課程
        </DesktopNavItem>
        {/* 教練第二個連結是「課程管理」（自己開的課）；學員身分的「我的課程」收在帳戶選單，避免兩個「我的課程」混淆 */}
        {auth === "coach" && (
          <DesktopNavItem href={ROUTES.coachCourses} active={current === "coach-courses"}>
            課程管理
          </DesktopNavItem>
        )}
        {auth === "user" && (
          <DesktopNavItem href={ROUTES.myCourses} active={current === "my-courses"}>
            我的課程
          </DesktopNavItem>
        )}
        <div className="flex-1" />
        {!loggedIn && (
          <>
            <Link href={ROUTES.login} className={`${buttonClassName("ghost")} w-[120px]`}>
              登入
            </Link>
            <Link href={ROUTES.register} className={`${buttonClassName("primary")} w-[120px]`}>
              註冊
            </Link>
          </>
        )}
        {auth === "user" && (
          <Link href={ROUTES.becomeCoach} className={`${buttonClassName("secondary")} w-[120px]`}>
            成為教練
          </Link>
        )}
        {loggedIn && (
          <>
            <NotificationLink />
            <div className="relative">
              <button
                type="button"
                aria-label="帳戶選單"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((v) => !v)}
                className="flex size-10 items-center justify-center rounded-pill bg-tint-blue-200 text-text-primary"
              >
                <Icon name="user" />
              </button>
              {accountOpen && (
                <>
                  <button
                    type="button"
                    aria-label="關閉選單"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={closeAll}
                  />
                  <AccountMenu coach={auth === "coach"} onSelect={closeAll} />
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* 手機 */}
      <div className="flex h-16 items-center gap-3 px-[var(--spacing-screen-padding)] md:hidden">
        <Link href="/" aria-label="夠練 GoLand 首頁" className="shrink-0" onClick={closeAll}>
          <LogoFull className="h-11 w-auto" />
        </Link>
        <div className="flex-1" />
        {loggedIn ? (
          <NotificationLink />
        ) : (
          <Link href={ROUTES.login} className={`${buttonClassName("primary")} w-[120px]`}>
            登入
          </Link>
        )}
        <button
          type="button"
          aria-label="選單"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((v) => !v)}
          className="text-text-primary"
        >
          <Icon name="menu" />
        </button>
      </div>

      {drawerOpen && <MobileDrawer auth={auth} onSelect={closeAll} />}
    </header>
  );
}

function DesktopNavItem({
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
      className="flex flex-col items-center gap-1.5 text-text-primary"
    >
      <span className={active ? "text-button" : "text-body"}>{children}</span>
      <span className={`h-[3px] w-6 rounded-pill ${active ? "bg-brand-blue" : ""}`} />
    </Link>
  );
}

function NotificationLink() {
  return (
    <Link
      href={ROUTES.notifications}
      aria-label="通知"
      className="flex size-10 shrink-0 items-center justify-center text-text-primary"
    >
      <Icon name="bell" />
    </Link>
  );
}

function MenuItem({
  href,
  icon,
  onSelect,
  children,
  className,
}: {
  href: string;
  icon: IconName;
  onSelect: () => void;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <Link href={href} onClick={onSelect} className={`flex items-center gap-3 text-text-primary ${className}`}>
      <Icon name={icon} />
      {children}
    </Link>
  );
}

// 登出按鈕不能在點擊時關閉選單：選單一關，這個 <form> 就被卸載，送出動作還沒開始就沒了（點了沒反應）。
// 登出後 logout() 會導回首頁，導覽列依登入狀態重新渲染，選單自然消失。
function LogoutItem({ className }: { className: string }) {
  return (
    <form action={logout}>
      <button type="submit" className={`flex w-full items-center gap-3 text-text-primary ${className}`}>
        <Icon name="log-out" />
        登出
      </button>
    </form>
  );
}

function AccountMenu({ coach, onSelect }: { coach: boolean; onSelect: () => void }) {
  const item = "text-body px-4 py-3";
  return (
    <div className="absolute right-0 top-full z-20 mt-2 flex w-60 flex-col rounded-md border border-border-default bg-brand-white py-2 shadow-md">
      <MenuItem href={coach ? ROUTES.coachAccount : ROUTES.account} icon="user" onSelect={onSelect} className={item}>
        我的帳戶
      </MenuItem>
      <MenuItem href={ROUTES.myCourses} icon="calendar" onSelect={onSelect} className={item}>
        我的課程
      </MenuItem>
      {coach && (
        <MenuItem href={ROUTES.coachWorkspace} icon="award" onSelect={onSelect} className={item}>
          教練工作台
        </MenuItem>
      )}
      <LogoutItem className={item} />
    </div>
  );
}

function MobileDrawer({ auth, onSelect }: { auth: NavAuth; onSelect: () => void }) {
  const loggedIn = auth !== "guest";
  const item = "text-body-large py-3.5";
  return (
    <nav className="absolute inset-x-0 top-full z-20 flex flex-col gap-1 border-b border-border-default bg-brand-white p-4 shadow-md md:hidden">
      <Link href={ROUTES.explore} onClick={onSelect} className={`${item} text-text-primary`}>
        探索課程
      </Link>
      {loggedIn ? (
        <>
          {auth === "coach" && (
            <Link href={ROUTES.coachCourses} onClick={onSelect} className={`${item} text-text-primary`}>
              課程管理
            </Link>
          )}
          <Link href={ROUTES.myCourses} onClick={onSelect} className={`${item} text-text-primary`}>
            我的課程
          </Link>
          <MenuItem href={ROUTES.notifications} icon="bell" onSelect={onSelect} className={item}>
            通知
          </MenuItem>
          <MenuItem
            href={auth === "coach" ? ROUTES.coachAccount : ROUTES.account}
            icon="user"
            onSelect={onSelect}
            className={item}
          >
            我的帳戶
          </MenuItem>
          {auth === "coach" && (
            <MenuItem href={ROUTES.coachWorkspace} icon="award" onSelect={onSelect} className={item}>
              教練工作台
            </MenuItem>
          )}
          <LogoutItem className={item} />
          {auth === "user" && (
            <Link
              href={ROUTES.becomeCoach}
              onClick={onSelect}
              className={buttonClassName("secondary", true)}
            >
              成為教練
            </Link>
          )}
        </>
      ) : (
        <Link href={ROUTES.register} onClick={onSelect} className={buttonClassName("primary", true)}>
          註冊
        </Link>
      )}
    </nav>
  );
}
