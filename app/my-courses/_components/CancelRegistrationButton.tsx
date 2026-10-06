"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { cancelRegistration } from "@/app/registrations/actions";
import {
  COACH_ASSIST_REFUND_FEE_RATE,
  LEARNER_CANCEL_WINDOW_HOURS,
  coachAssistRefundAmounts,
} from "@/app/registrations/_lib/cancel-rules";
import { CloseIcon } from "./Icons";
import type { CANCEL_OUTCOME_TEXT } from "../_lib/display";

interface Props {
  registrationId: string;
  // 資料層判斷的取消結果：尚未扣款（cancel_unpaid）或已扣款全額退款（refund_full），決定金額明細怎麼寫
  outcome: keyof typeof CANCEL_OUTCOME_TEXT;
  // 這筆報名的金額（NT$）
  amount: number;
  // 觸發按鈕的樣式由卡片決定（設計稿是藍框膠囊）
  className?: string;
}

// 取消前先跳確認視窗（設計稿 S09「取消報名確認」）。
// 取消成功後 server action 會 revalidatePath("/my-courses")，清單會自己更新。
export default function CancelRegistrationButton({ registrationId, outcome, amount, className }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 學員自己取消只會發生在開課 24 小時前：手續費 0，已扣款者全額退回。
  // 24 小時內要教練協助（收 50% 手續費），金額用 Ted 的 coachAssistRefundAmounts 算，規則改了會自動跟著變。
  const money = (n: number) => `NT$${n.toLocaleString()}`;
  const lateFee = coachAssistRefundAmounts(amount).fee;
  const rows =
    outcome === "refund_full"
      ? [
          ["已扣款", money(amount)],
          ["取消手續費", money(0)],
          ["退款金額", money(amount)],
        ]
      : [
          ["課程費用", `${money(amount)}（尚未扣款）`],
          ["取消手續費", money(0)],
          ["退款金額", "不需退款（未扣款）"],
        ];

  function confirmCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelRegistration(registrationId);
      if (result.error) {
        setError(result.error);
        return;
      }
      dialog.current?.close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          dialog.current?.showModal();
        }}
        className={className}
      >
        取消報名
      </button>

      <dialog
        ref={dialog}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-(--radius-lg) bg-(--color-surface-default) p-6 text-(--color-text-primary) shadow-(--shadow-md) backdrop:bg-black/40"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-h3">確定要取消報名？</h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            disabled={pending}
            aria-label="關閉"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-tint-blue-100) hover:bg-(--color-tint-blue-200) disabled:opacity-40"
          >
            <CloseIcon size={16} />
          </button>
        </div>
        <p className="text-body mt-3 text-(--color-text-secondary)">
          取消後名額會釋出。已確定開課並已扣款者，開課 {LEARNER_CANCEL_WINDOW_HOURS} 小時前取消將全額退款。
        </p>
        <dl className="text-body-small mt-4 space-y-1.5 rounded-(--radius-md) border border-(--color-border-default) p-3">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-(--color-text-secondary)">{label}</dt>
              <dd className="font-bold!">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="text-body-small mt-3 space-y-2 rounded-(--radius-md) bg-(--color-brand-light) p-3">
          <p>開課前 {LEARNER_CANCEL_WINDOW_HOURS} 小時以上：可線上取消，已扣款者全額退款</p>
          <p>
            開課前 {LEARNER_CANCEL_WINDOW_HOURS} 小時內：請聯絡教練協助，將收取 {Math.round(COACH_ASSIST_REFUND_FEE_RATE * 100)}% 取消手續費（這筆報名約 {money(lateFee)}）
          </p>
          {/* 條款頁是牛牛的 #53（/terms#refund）；合併前點不開 */}
          <Link href="/terms#refund" className="block font-bold underline">
            查看完整取消與退款規定
          </Link>
        </div>
        {error && (
          <p role="alert" className="text-body-small mt-3 text-(--color-state-error-text)">
            {error}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            disabled={pending}
            className="text-button rounded-full border border-(--color-brand-blue) bg-(--color-surface-default) px-5 py-2.5 hover:bg-(--color-tint-blue-100) disabled:opacity-40"
          >
            保留報名
          </button>
          <button
            type="button"
            onClick={confirmCancel}
            disabled={pending}
            className="text-button rounded-full bg-(--color-brand-blue) px-5 py-2.5 text-(--color-text-inverse) hover:bg-(--color-brand-blue-pressed) disabled:opacity-40"
          >
            {pending ? "取消中…" : "確認取消"}
          </button>
        </div>
      </dialog>
    </>
  );
}
