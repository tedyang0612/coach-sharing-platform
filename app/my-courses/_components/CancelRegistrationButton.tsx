"use client";

import { useRef, useState, useTransition } from "react";
import { cancelRegistration } from "@/app/registrations/actions";
import { CANCEL_OUTCOME_TEXT } from "../_lib/display";

interface Props {
  registrationId: string;
  outcome: keyof typeof CANCEL_OUTCOME_TEXT;
}

// 取消前先跳確認視窗，說明結果（尚未扣款／全額退款）。
// 取消成功後 server action 會 revalidatePath("/my-courses")，清單會自己更新。
export default function CancelRegistrationButton({ registrationId, outcome }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
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
          dialog.current?.showModal();
        }}
        className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
      >
        取消報名
      </button>

      <dialog
        ref={dialog}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl p-6 backdrop:bg-black/40"
      >
        <h2 className="text-base font-bold text-neutral-900">確定要取消報名嗎？</h2>
        <p className="mt-2 text-sm text-neutral-600">{CANCEL_OUTCOME_TEXT[outcome]}</p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            disabled={pending}
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-40"
          >
            先不要
          </button>
          <button
            type="button"
            onClick={confirmCancel}
            disabled={pending}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40"
          >
            {pending ? "取消中…" : "確定取消"}
          </button>
        </div>
      </dialog>
    </>
  );
}
