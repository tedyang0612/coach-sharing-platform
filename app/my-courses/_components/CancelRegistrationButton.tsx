"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { cancelRegistration } from "@/app/registrations/actions";
import {
  calculateLearnerCancel,
  CANCEL_OUTCOME_LABELS,
  type LearnerCancelQuote,
} from "@/app/registrations/_lib/cancel-rules";
import type { RegistrationStatus } from "@/types/database";
import { CloseIcon } from "./Icons";

interface Props {
  registrationId: string;
  // 算手續費與退款金額要用的資料（Ted 的 calculateLearnerCancel）
  amount: number;
  status: RegistrationStatus;
  sessionStartAt: string;
  registrationDeadlineAt: string;
  // 觸發按鈕的樣式由卡片決定（設計稿是藍框膠囊）
  className?: string;
}

const money = (n: number) => `NT$${n.toLocaleString()}`;

// 取消前先跳確認視窗（設計稿 S09「取消報名確認」）。
// 取消成功後 server action 會 revalidatePath("/my-courses")，清單會自己更新。
export default function CancelRegistrationButton({
  registrationId,
  amount,
  status,
  sessionStartAt,
  registrationDeadlineAt,
  className,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<LearnerCancelQuote | null>(null);
  const [pending, startTransition] = useTransition();

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
          // 打開視窗當下才算：級距取決於「現在」距開課幾小時，頁面載入後放久了會變
          setQuote(calculateLearnerCancel({ amount, status, sessionStartAt, registrationDeadlineAt }));
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
        {quote?.ok ? (
          quote.tier === "free" ? (
            <p className="text-body mt-3 text-(--color-text-secondary)">{CANCEL_OUTCOME_LABELS.cancel_unpaid}</p>
          ) : (
            // 金額由 calculateLearnerCancel 算出，和實際退款是同一個公式
            <dl className="text-body mt-3 space-y-1.5 text-(--color-text-secondary)">
              <div className="flex justify-between gap-3">
                <dt>課程費用</dt>
                <dd>{money(amount)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>取消手續費（{Math.round(quote.feeRate * 100)}%）</dt>
                <dd>－{money(quote.feeAmount)}</dd>
              </div>
              <div className="flex justify-between gap-3 font-bold text-(--color-text-primary)">
                <dt>退款金額</dt>
                <dd>{money(quote.refundAmount)}</dd>
              </div>
            </dl>
          )
        ) : (
          <p className="text-body mt-3 text-(--color-text-secondary)">{quote?.message}</p>
        )}
        {/* 條款頁是牛牛的 #53（/terms#refund） */}
        <Link href="/terms#refund" className="text-body-small mt-4 block font-bold underline">
          查看完整取消與退款規定
        </Link>
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
            disabled={pending || !quote?.ok}
            className="text-button rounded-full bg-(--color-brand-blue) px-5 py-2.5 text-(--color-text-inverse) hover:bg-(--color-brand-blue-pressed) disabled:opacity-40"
          >
            {pending ? "取消中…" : "確認取消"}
          </button>
        </div>
      </dialog>
    </>
  );
}
