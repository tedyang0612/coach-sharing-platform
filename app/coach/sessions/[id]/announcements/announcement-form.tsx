"use client";

import { useState, useTransition, type FormEvent } from "react";
import { sendAnnouncement } from "@/app/actions/announcements";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { ANNOUNCEMENT_MAX_LENGTH } from "@/lib/announcements/constants";
import { contactInfoWarning } from "@/lib/coach-application/validation";

type AnnouncementFormProps = {
  sessionId: string;
  // 會收到公告的學員人數；0 代表沒有有效報名，不能發送
  recipientCount: number;
};

export function AnnouncementForm({ sessionId, recipientCount }: AnnouncementFormProps) {
  const [content, setContent] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [sendError, setSendError] = useState<string>();
  const [sentMessage, setSentMessage] = useState<string>();
  const [isSending, startSend] = useTransition();

  const length = Array.from(content.trim()).length;
  const tooLong = length > ANNOUNCEMENT_MAX_LENGTH;
  // 公告不可填寫聯絡資訊，邊打字邊檢查（PRD 7.0 規格 4、第六章 7）
  const contactWarning = contactInfoWarning(content);
  const isEmpty = length === 0;
  const invalid = tooLong || contactWarning !== undefined;
  const canSend = recipientCount > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setSendError(undefined);
    setSentMessage(undefined);
    if (isEmpty || invalid || !canSend) return;

    startSend(async () => {
      const result = await sendAnnouncement({ sessionId, content });
      if (result.ok) {
        setSentMessage(`公告已發送給 ${recipientCount} 位學員。`);
        setContent("");
        setAttempted(false);
      } else {
        setSendError(result.error);
      }
    });
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="content" className="text-sm font-semibold text-neutral-800">
          公告內容
        </label>
        <p className="text-xs text-neutral-500">
          可填寫集合地點、裝備、穿著等提醒。請勿填寫聯絡方式，系統會在成團時提供給學員。
        </p>
        <textarea
          id="content"
          name="content"
          rows={6}
          disabled={!canSend}
          placeholder="例：明天請提早 10 分鐘到一樓櫃檯集合，記得帶毛巾和水壺。"
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setSentMessage(undefined);
          }}
          aria-invalid={invalid ? true : undefined}
          className={`rounded-xl border bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:bg-white focus:ring-2 disabled:opacity-50 ${
            invalid
              ? "border-red-500 focus:border-red-500 focus:ring-red-100"
              : "border-neutral-200 focus:border-brand focus:ring-brand-ink"
          }`}
        />
        <p className={`text-xs ${tooLong ? "text-red-600" : "text-neutral-400"}`}>
          {length}/{ANNOUNCEMENT_MAX_LENGTH}
          {tooLong && "，超過字數上限"}
        </p>
        {contactWarning && <p className="text-xs text-red-600">{contactWarning}</p>}
        {attempted && isEmpty && <p className="text-xs text-red-600">請輸入公告內容</p>}
      </div>

      {sendError && <FormError message={sendError} />}
      {sentMessage && (
        <p
          role="status"
          className="rounded-xl border border-brand bg-brand-ink px-4 py-3.5 text-sm font-bold text-brand"
        >
          {sentMessage}
        </p>
      )}

      <Button type="submit" disabled={isSending || !canSend}>
        {isSending
          ? "發送中…"
          : canSend
            ? `發送給 ${recipientCount} 位學員`
            : "目前沒有可發送的學員"}
      </Button>
    </form>
  );
}
