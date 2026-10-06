"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { resolveCoverUrl } from "@/app/courses/_lib/cover-image";
import { RefundRules } from "@/components/course/refund-rules";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import { FormError } from "@/components/ui/form-error";
import { Modal } from "@/components/ui/modal";
import { RadioField } from "@/components/ui/radio";
import { createRegistration, type RegistrationActionState } from "../actions";
import { HEALTH_DECLARATION_LABEL, PAYMENT_METHODS } from "../_lib/registration-rules";
import { registrationSuccessHref } from "../_lib/routes";

type Summary = {
  title: string;
  coachName: string;
  coverUrl: string | null;
  sportType: string;
  session: { date: string; weekday: string; time: string };
  location: string;
  price: number;
};

const TWD = new Intl.NumberFormat("zh-TW");
const latin = "font-[family-name:var(--font-latin)] font-medium";
const initialState: RegistrationActionState = {};

export function CheckoutView({
  sessionId,
  courseHref,
  summary,
}: {
  sessionId: string;
  courseHref: string;
  summary: Summary;
}) {
  const router = useRouter();
  const [declared, setDeclared] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [payment, setPayment] = useState<string>(PAYMENT_METHODS[0]);
  const [state, formAction, pending] = useActionState(createRegistration, initialState);

  useEffect(() => {
    if (state.ok && state.registrationId) router.replace(registrationSuccessHref(state.registrationId));
  }, [state, router]);

  const price = `NT$${TWD.format(summary.price)}`;
  const submit = (
    <Button type="submit" form="checkout-form" fullWidth loading={pending} disabled={!declared}>
      模擬付款
    </Button>
  );

  return (
    <main className="flex-1 px-[var(--spacing-screen-padding)] pb-32 pt-4 md:px-[240px] md:pb-20 md:pt-10">
      {/* S06 健康聲明：確認鈕在勾選前維持停用（Figma Modal 33:682 說明） */}
      <Modal title="健康聲明" open={!declared} onClose={() => router.push(courseHref)}>
        <p className="text-body text-text-secondary">
          為了你的安全，請確認自己的身體狀況適合參與運動課程。我們不會蒐集任何病史資料。
        </p>
        <CheckboxField
          name="health_declaration_dialog"
          label={HEALTH_DECLARATION_LABEL}
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => router.push(courseHref)}>
            取消
          </Button>
          <Button type="button" className="flex-1" disabled={!agreed} onClick={() => setDeclared(true)}>
            確認並繼續
          </Button>
        </div>
      </Modal>

      <form
        id="checkout-form"
        action={formAction}
        className="grid gap-4 md:grid-cols-[minmax(0,1fr)_400px] md:gap-x-8"
      >
        <input type="hidden" name="session_id" value={sessionId} />
        {declared && <input type="hidden" name="health_declaration" value="on" />}

        <h1 className="text-h1 text-text-primary md:col-start-1">確認報名與付款</h1>

        <aside className="flex flex-col gap-4 md:col-start-2 md:row-span-3 md:row-start-1">
          <section className="flex flex-col gap-3.5 rounded-lg border border-border-default bg-brand-white p-6">
            <h2 className="text-h3 text-text-primary">訂單摘要</h2>
            <div className="flex items-start gap-3">
              <div className="relative h-16 w-[100px] shrink-0 overflow-clip rounded-md bg-tint-blue-100">
                <Image
                  src={resolveCoverUrl({ cover_image_url: summary.coverUrl, sport_type: summary.sportType })}
                  alt=""
                  fill
                  sizes="100px"
                  className="object-cover"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-button text-text-primary">{summary.title}</p>
                <p className="text-body-small text-text-secondary">
                  <span className={latin}>{summary.coachName}</span> 教練
                </p>
              </div>
            </div>
            <SummaryRow label="場次">
              <span className={latin}>{summary.session.date}</span>（{summary.session.weekday}）
              <span className={latin}>{summary.session.time}</span>
            </SummaryRow>
            <SummaryRow label="地點">{summary.location}</SummaryRow>
            <SummaryRow label="每人費用">
              <span className={latin}>{price}</span>
            </SummaryRow>
            <hr className="border-border-default" />
            <div className="flex items-start gap-3">
              <span className="text-body-small text-text-secondary">預計扣款金額（確定開課時）</span>
              <span className="flex-1" />
              <span className={`text-[18px] leading-[26px] text-text-primary ${latin}`}>{price}</span>
            </div>
          </section>
          <div className="hidden flex-col gap-4 md:flex">
            {state.error && <FormError message={state.error} />}
            {submit}
            <p className="text-caption text-text-secondary">按下後僅確認付款方式，確定開課時才會扣款。</p>
          </div>
        </aside>

        <section className="flex flex-col gap-3 rounded-lg border border-border-default bg-brand-white p-6 md:col-start-1">
          <h2 className="text-h3 text-text-primary">付款方式</h2>
          <p className="text-body-small text-text-secondary">僅為畫面選項，這次不會真的扣款。</p>
          {PAYMENT_METHODS.map((method) => {
            const selected = payment === method;
            return (
              <RadioField
                key={method}
                name="payment_method"
                value={method}
                label={method}
                checked={selected}
                onChange={() => setPayment(method)}
                className={`rounded-md px-4 py-3.5 ${selected ? "border-2 border-brand-deep bg-tint-blue-100" : "border border-border-default bg-brand-white"}`}
              />
            );
          })}
        </section>

        <RefundRules className="md:col-start-1" />
      </form>

      {/* 手機版底部固定列（Figma 42:1963） */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t border-border-default bg-brand-white px-[var(--spacing-screen-padding)] pb-6 pt-3 md:hidden">
        {state.error && <FormError message={state.error} />}
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 flex-col">
            <span className="text-caption text-text-secondary">確定開課時扣款</span>
            <span className={`text-h2 text-text-primary ${latin}`}>{price}</span>
          </div>
          <div className="flex-1">{submit}</div>
        </div>
      </div>
    </main>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-body-small shrink-0 text-text-secondary">{label}</span>
      <span className="flex-1" />
      <span className="text-body text-right text-text-primary">{children}</span>
    </div>
  );
}
