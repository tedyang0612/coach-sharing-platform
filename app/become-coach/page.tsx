import type { Metadata } from "next";
import Link from "next/link";
import { LogoBadge } from "@/components/brand/logo-badge";

export const metadata: Metadata = {
  title: "成為教練｜夠練 GoLand",
  description: "申請成為夠練 GoLand 教練，上架小班課、由平台處理報名與收款。",
};

// 版面參考 docs/reference 的 P14；文案以 PRD v4.2 為準（成團才扣款、媒合費 5%、每週三撥款）。
const BENEFITS = [
  {
    title: "自訂價格與成團人數",
    body: "自己設定每人費用與人數下限，報名截止時達到下限才成團開課。",
  },
  {
    title: "平台代收、每週三撥款",
    body: "學員款項由平台代收，課程完成後扣除 5% 媒合費，每週三撥款。",
  },
  {
    title: "範本快速開課",
    body: "常開的課存成範本，複製後改個日期就能再次發布。",
  },
];

const STEPS = [
  { title: "填寫申請", body: "個人資料、聯絡方式，並上傳良民證。" },
  { title: "平台審核", body: "由管理員人工審核，結果會以站內通知告知。" },
  { title: "開始開課", body: "審核通過後開放教練工作台，個人檔案同步公開。" },
];

const CHECKLIST = [
  "個人照片",
  "學經歷與簡述",
  "良民證（必填）",
  "專業證照（選填）",
  "聯絡方式（電話、LINE、Email 或社群帳號）至少一項（除學員必要課務聯繫外，不作行銷用途，亦不提供給其他無關第三方。）",
];

export default function BecomeCoachPage() {
  return (
    <main className="flex-1 px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        <header className="flex flex-col items-center gap-3 text-center">
          <LogoBadge />
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
            成為夠練教練
          </h1>
          <p className="max-w-lg text-sm text-neutral-500">
            上架你的小班課，報名、收款與成團判斷交給平台，你專心教學就好。
          </p>
        </header>

        <section aria-label="成為教練的好處" className="grid gap-4 md:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-2xl border border-neutral-200 bg-white p-5"
            >
              <h2 className="text-sm font-bold text-neutral-900">{benefit.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {benefit.body}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-neutral-900">申請流程</h2>
          <ol className="mt-4 flex flex-col gap-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-ink text-sm font-bold text-brand">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{step.title}</p>
                  <p className="mt-0.5 text-sm text-neutral-500">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-neutral-900">申請前請先準備</h2>
          <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm text-neutral-600">
            {CHECKLIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-neutral-500">
            良民證僅用於身分審核，審核完成後 7 日內刪除原檔。聯絡方式不會公開，只在場次成團後透過行前公告提供給該場次學員。
          </p>
        </section>

        <div className="flex justify-center">
          {/* 樣式比照 components/ui/button.tsx；這裡是換頁所以用 Link 而不是 <button> */}
          <Link
            href="/coach/apply"
            className="w-full rounded-xl bg-brand px-8 py-3 text-center text-sm font-bold text-white transition hover:opacity-90 sm:w-auto"
          >
            開始填寫教練申請
          </Link>
        </div>
      </div>
    </main>
  );
}
