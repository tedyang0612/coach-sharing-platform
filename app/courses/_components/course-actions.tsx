"use client";

// 課程管理頁上的操作按鈕：取消場次（PRD 1.0 規格7／AC4）、另存範本（規格3）。
// 按鈕顯示與否由頁面依 canCoachCancelSession() 決定；server action 送出時會再檢查一次。

import { useActionState } from "react";
import { FormError } from "@/components/ui/form-error";
import { cancelSession, saveCourseAsTemplate, type SessionActionState } from "../actions";

const initialState: SessionActionState = {};

export function CancelSessionButton({
  sessionId,
  timeLabel,
  activeCount,
}: {
  sessionId: string;
  timeLabel: string;
  activeCount: number;
}) {
  const [state, formAction, pending] = useActionState(cancelSession, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const notice =
          activeCount > 0 ? `\n已報名的 ${activeCount} 位學員會收到取消通知，報名改為「已取消（未扣款）」。` : "";
        if (!window.confirm(`確定要取消 ${timeLabel} 這個場次嗎？取消後無法復原。${notice}`)) e.preventDefault();
      }}
      className="flex flex-col gap-2 sm:items-end"
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "取消中…" : "取消場次"}
      </button>
      {state.error && <FormError message={state.error} />}
    </form>
  );
}

export function SaveAsTemplateButton({ courseId }: { courseId: string }) {
  const [state, formAction, pending] = useActionState(saveCourseAsTemplate, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <input type="hidden" name="courseId" value={courseId} />
      <button
        type="submit"
        disabled={pending || state.success}
        className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
      >
        {state.success ? "已存成範本 ✓" : pending ? "儲存中…" : "另存範本"}
      </button>
      {state.error && <FormError message={state.error} />}
    </form>
  );
}
