import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "成為教練｜夠練 GoLand",
  description: "申請成為夠練 GoLand 教練，上架小班課、由平台處理報名與收款。",
};

// 版面參考 docs/reference 的 P14；文案以 PRD v4.6 為準（確定開課才扣款、媒合費 5%、每週三撥款）。
const BENEFITS = [
  {
    title: "自訂價格與開課人數",
    body: "自由設定每人費用與人數上限下限，報名截止預設為開課前 24 小時。",
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
  { title: "填寫申請", body: "個人資料、聯絡方式，並上傳良民證以及相關證照。" },
  { title: "平台審核", body: "由管理員人工審核，結果會以站內通知及 Email 告知。" },
  { title: "開始開課", body: "審核通過後開放教練工作台，個人檔案同步公開。" },
];

const CHECKLIST = [
  "大頭貼",
  "生活／運動照片",
  "學歷與簡述",
  "良民證（必填）",
  "專業證照（選填）",
  "聯絡方式：電話、LINE 或社群帳號至少一項（除學員必要課務聯繫外，不作行銷用途，亦不提供給其他無關第三方。）",
];

export default function BecomeCoachPage() {
  return (
    <main className="flex-1 px-4 pb-8 pt-5 sm:px-6 sm:pb-20 sm:pt-10">
      <div className="mx-auto flex w-full max-w-[800px] flex-col gap-4">
        <header className="flex flex-col gap-4">
          <h1 className="text-h1 text-text-primary">
            成為夠練
          </h1>
          <p className="text-body text-text-secondary">
            上架你的小班課，報名、收款與開課確認交給平台，你專心教學就好。
          </p>
        </header>

        <section aria-label="成為教練的好處" className="grid gap-4 md:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-lg border border-border-default bg-brand-white p-6"
            >
              <h2 className="text-h3 text-text-primary">{benefit.title}</h2>
              <p className="text-body-small mt-2 text-text-secondary">
                {benefit.body}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-border-default bg-brand-white p-6">
          <h2 className="text-h3 text-text-primary">申請流程</h2>
          <ol className="mt-4 flex flex-col gap-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="text-label flex size-7 shrink-0 items-center justify-center rounded-pill bg-tint-blue-200 text-text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="text-body font-medium text-text-primary">{step.title}</p>
                  <p className="text-body-small mt-0.5 text-text-secondary">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-lg border border-border-default bg-brand-white p-6">
          <h2 className="text-h3 text-text-primary">申請前請先準備</h2>
          <ul className="text-body mt-4 flex list-disc flex-col gap-2 pl-5 text-text-primary">
            {CHECKLIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-caption mt-4 text-text-secondary">
            聯絡方式不會公開，只在場次確定開課後透過行前公告提供給該場次學員。
          </p>
        </section>

        <section className="rounded-lg border border-border-default bg-brand-white p-6">
          <h2 className="text-h3 text-text-primary">為什麼需要良民證？</h2>
          <dl className="mt-4 flex flex-col gap-4">
            <div>
              <dt className="text-body font-medium text-text-primary">讓學員安心報名</dt>
              <dd className="text-body-small mt-1 text-text-secondary">
                學員會和教練實際見面上課，平台以良民證（警察刑事紀錄證明）作為基本把關。
              </dd>
            </div>
            <div>
              <dt className="text-body font-medium text-text-primary">怎麼申請</dt>
              {/* 申請方式與費用依內政部警政署公告（2026/10 查詢），之後若有調整請同步更新 */}
              <dd className="text-body-small mt-1 text-text-secondary">
                可在內政部警政署網站線上申請，再攜帶身分證件到警察局領取。規費每份新臺幣 100
                元，一般約 1–3 個工作天，實際時間以各地警察局為準。
              </dd>
            </div>
            <div>
              <dt className="text-body font-medium text-text-primary">我們怎麼保管</dt>
              <dd className="text-body-small mt-1 text-text-secondary">
                僅用於身分審核，審核完成後 7 日內刪除原檔，只保留審核結果與審核日期。
              </dd>
            </div>
          </dl>
        </section>

        <div className="flex justify-end">
          {/* 樣式比照 components/ui/button.tsx；這裡是換頁所以用 Link 而不是 <button> */}
          <Link
            href="/coach/apply"
            className={buttonClassName("primary")}
          >
            開始填寫教練申請
          </Link>
        </div>
      </div>
    </main>
  );
}
