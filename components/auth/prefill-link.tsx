"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { savePrefill } from "@/lib/auth/prefill";

type PrefillLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  /** 要把頁面上表單已輸入的哪些欄位帶到下一頁：登入→註冊帶 Email＋密碼；註冊→登入只帶 Email（新設的密碼不一定是舊密碼） */
  carry: "email-and-password" | "email";
};

/**
 * 登入頁的「免費註冊」、註冊頁的「直接登入」：跳轉前把表單裡已經輸入的 Email（與密碼）暫存起來，
 * 下一頁的表單會自動帶入（見 lib/auth/prefill.ts）。連結本身照常跳轉，不攔截。
 */
export function PrefillLink({ href, className, children, carry }: PrefillLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        const form = document.querySelector("form");
        const field = (name: string) => (form?.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "";
        savePrefill({
          email: field("email"),
          password: carry === "email-and-password" ? field("password") : "",
        });
      }}
    >
      {children}
    </Link>
  );
}
