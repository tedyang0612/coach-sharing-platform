import Image from "next/image";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { GroupProgress } from "@/components/ui/group-progress";
import successCheck from "@/components/ui/icons/misc/success-check.svg";

// S08｜報名成功的畫面（純顯示，資料由 page.tsx 讀好傳入）。
type DateParts = { date: string; weekday: string; time: string };

const latin = "font-[family-name:var(--font-latin)] font-medium";

export function SuccessView({
  orderNumber,
  title,
  location,
  paymentMethod,
  deadline,
  range,
  enrolled,
  minParticipants,
}: {
  orderNumber: string;
  title: string;
  location: string;
  paymentMethod: string;
  deadline: DateParts;
  range: DateParts;
  enrolled: number;
  minParticipants: number;
}) {
  return (
    <main className="flex flex-1 flex-col items-center gap-5 px-[var(--spacing-screen-padding)] pb-20 pt-10 md:pt-14">
      <div className="flex size-[72px] items-center justify-center rounded-pill bg-brand-deep">
        <Image src={successCheck} alt="" width={36} height={36} />
      </div>
      <h1 className="text-h1 text-text-primary">報名成功！</h1>
      <p className="text-body-large max-w-[520px] text-center text-text-secondary">
        預計於 <span className={latin}>{deadline.date}</span>（{deadline.weekday}）
        <span className={latin}>{deadline.time}</span> 前通知是否確定開課，確定開課後才會扣款。
      </p>

      <section className="flex w-full flex-col gap-3.5 rounded-lg border border-border-default bg-brand-white p-6 md:w-[560px]">
        <Row label="訂單編號">
          <span className={latin}>{orderNumber}</span>
        </Row>
        <Row label="課程">{title}</Row>
        <Row label="場次">
          <span className={latin}>{range.date}</span>（{range.weekday}）<span className={latin}>{range.time}</span>
        </Row>
        <Row label="地點">{location}</Row>
        <Row label="付款方式">{paymentMethod}（尚未扣款）</Row>
        <hr className="border-border-default" />
        <h2 className="text-[17px] font-bold leading-[18px] text-text-primary">目前報名進度</h2>
        <GroupProgress enrolled={enrolled} minParticipants={minParticipants} />
        <p className="text-body text-text-secondary">
          開課條件：最少 <span className={latin}>{minParticipants}</span> 人。未達人數時場次自動取消，不會扣款。
        </p>
      </section>

      <div className="flex w-full gap-3 md:w-[560px]">
        <Link href="/courses" className={`${buttonClassName("secondary")} flex-1`}>
          繼續探索課程
        </Link>
        <Link href="/my-courses" className={`${buttonClassName("primary")} flex-1`}>
          前往我的課程
        </Link>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-body-small shrink-0 text-text-secondary">{label}</span>
      <span className="flex-1" />
      <span className="text-body text-right text-text-primary">{children}</span>
    </div>
  );
}
