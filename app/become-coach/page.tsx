import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "成為教練｜夠練 GoLand",
  description: "申請成為夠練 GoLand 教練，上架小班課、由平台處理報名與收款。",
};

// 設計稿沒有這一頁（設計上直接進表單）；PM 決定保留，給還沒登入的人看好處與準備清單。
// 「為什麼需要良民證」的說明在申請表單的「身分文件」卡片（設計稿 C01），這裡不重複。
// 文案以 PRD v4.6 為準（確定開課才扣款、媒合費 5%、每週三撥款）。
const BENEFITS = [
  {
    title: "自主彈性排課",
    body: "時間、地點、人數都由你決定，隨時上架、不受限制。",
  },
  {
    title: "定期透明撥款",
    body: "收費公開透明，課程完成後每週撥款。",
  },
  {
    title: "精準曝光招生",
    body: "專屬教練頁面展示證照與學員評價，累積個人品牌。",
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
  "良民證（必填；用途、申請方式與保管方式在申請表單裡有說明）",
  "專業證照（選填）",
  "聯絡方式：電話、LINE 或社群帳號至少一項（除學員必要課務聯繫外，不作行銷用途，亦不提供給其他無關第三方。）",
];

export default async function BecomeCoachPage() {
  // 已經送過申請的人不用再看一次說明，直接帶去申請狀態頁；沒登入或還沒申請的人照常看說明
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: application } = await supabase
      .from("coach_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (application) redirect("/coach/application");
  }

  return (
    <main className="flex-1 px-4 pb-8 pt-5 sm:px-6 sm:pb-20 sm:pt-10">
      <div className="mx-auto flex w-full max-w-[800px] flex-col gap-4">
        <header className="flex flex-col items-center gap-4 rounded-lg bg-tint-blue-100 px-6 py-10 text-center sm:py-12">
          <h1 className="text-h1 text-text-primary">成為教練</h1>
          <p className="text-body text-text-secondary">把時間留給教學，剩下的交給夠練。</p>
          <ApplyLink />
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

        <div className="flex justify-center pt-2">
          <ApplyLink />
        </div>
      </div>
    </main>
  );
}

// 樣式比照 components/ui/button.tsx；這裡是換頁所以用 Link 而不是 <button>
function ApplyLink() {
  return (
    <Link
      href="/coach/apply"
      className={`${buttonClassName("primary")} w-full justify-center sm:w-1/2`}
    >
      開始填寫教練申請
    </Link>
  );
}
