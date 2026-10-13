import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "成為教練｜夠練 GoLand",
  description: "申請成為夠練 GoLand 教練，上架小班課、由平台處理報名與收款。",
};

// 1013 設計稿 C01 說明頁（桌機 565:1087／手機 566:9257）。文案以 PRD 為準（確定開課才扣款、媒合費 5%、每週三撥款）。
// 「為什麼需要良民證」的說明在申請表單的「身分文件」卡片，這裡不重複。
// 說明頁主視覺（吉祥物）與三個亮點圖示設計師尚未匯出 SVG（交接包 00_先讀我 第六節「還沒完成」），
// 檔案到位前先用圓圈佔位，到位後把 HeroIllustration／BenefitIcon 換成 <Image> 即可。
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
    // 底色：由上到下的淺藍漸層（brand-light → tint-blue-200），與結果頁一致
    <main className="flex-1 bg-linear-to-b from-brand-light to-tint-blue-200 px-4 pb-10 pt-8 sm:px-6 md:px-20 md:pb-20 md:pt-16">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 md:gap-10">
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
          <div className="order-2 flex flex-col gap-4 md:order-1 md:max-w-[560px]">
            <h1 className="text-display text-text-primary md:text-[48px]! md:leading-[60px]!">成為教練</h1>
            <p className="text-hero-lead text-text-primary">把時間留給教學，剩下的交給夠練。</p>
            <p className="text-body-large text-text-secondary">
              完成一次身分審核就能開課。審核通過後，你的帳號會多一個教練身分，原本的學員功能一樣可以用。
            </p>
            <ApplyLink className="mt-2 w-full md:w-[288px]" />
          </div>
          <HeroIllustration />
        </header>

        <section aria-label="成為教練的好處" className="grid gap-4 md:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="flex items-center gap-4 rounded-lg bg-brand-white/90 p-5"
            >
              <BenefitIcon />
              <div>
                <h2 className="text-h3 text-text-primary">{benefit.title}</h2>
                <p className="text-body-small mt-1 text-text-secondary">{benefit.body}</p>
              </div>
            </div>
          ))}
        </section>

        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <section className="rounded-lg bg-brand-white/90 p-6 md:p-8">
            <h2 className="text-h2 text-text-primary">申請流程</h2>
            <ol className="mt-5 flex flex-col gap-5">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="text-label flex size-9 shrink-0 items-center justify-center rounded-pill bg-tint-blue-100 text-brand-blue">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-h3 text-text-primary">{step.title}</p>
                    <p className="text-body-small mt-1 text-text-secondary">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-lg bg-brand-white/90 p-6 md:p-8">
            <h2 className="text-h2 text-text-primary">申請前請先準備</h2>
            <ul className="mt-5 flex flex-col gap-3">
              {CHECKLIST.map((item) => (
                <li key={item} className="text-body flex gap-3 text-text-primary">
                  <CheckMark />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-caption mt-5 text-text-secondary">
              聯絡方式不會公開，只在場次確定開課後透過行前公告提供給該場次學員。
            </p>
          </section>
        </div>

        <div className="flex justify-center pt-2">
          <ApplyLink className="w-full md:w-[288px]" />
        </div>
      </div>
    </main>
  );
}

// 樣式比照 components/ui/button.tsx；這裡是換頁所以用 Link 而不是 <button>
function ApplyLink({ className = "" }: { className?: string }) {
  return (
    <Link href="/coach/apply" className={`${buttonClassName("primary")} ${className}`}>
      開始填寫教練申請
    </Link>
  );
}

// 佔位：設計稿是吉祥物＋日曆的主視覺，檔案到位後換成 <Image>
function HeroIllustration() {
  return (
    <div
      aria-hidden="true"
      className="order-1 mx-auto size-[220px] shrink-0 rounded-pill bg-tint-blue-100 md:order-2 md:mx-0 md:size-[400px]"
    />
  );
}

// 佔位：三個亮點的圖示（72px 圓），檔案到位後換成 <Image>
function BenefitIcon() {
  return <span aria-hidden="true" className="size-[72px] shrink-0 rounded-pill bg-tint-blue-100" />;
}

function CheckMark() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-pill bg-brand-blue text-text-inverse"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 6.2l2.4 2.4 4.6-5" />
      </svg>
    </span>
  );
}
