"use client";

import { useState, useTransition, type FormEvent } from "react";
import { sendAnnouncement } from "@/app/actions/announcements";
import Link from "next/link";
import { Button, buttonClassName } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/ui/form-error";
import { ANNOUNCEMENT_MAX_LENGTH } from "@/lib/announcements/constants";
import { contactInfoWarning } from "@/lib/coach-application/validation";

type AnnouncementFormProps = {
  sessionId: string;
  // 會收到公告的學員人數；0 代表沒有有效報名，不能發送
  recipientCount: number;
  // 卡片標題下方那一行：課名・時間・已報名人數
  summary: string;
  // 「取消」要回到哪裡（課程管理頁）
  cancelHref: string;
};

export function AnnouncementForm({
  sessionId,
  recipientCount,
  summary,
  cancelHref,
}: AnnouncementFormProps) {
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

  const fieldError = contactWarning ?? (tooLong ? "超過字數上限" : attempted && isEmpty ? "請輸入公告內容" : undefined);

  // 設計稿 C06 是彈窗；這裡是獨立頁面，卡片的樣式與內容比照彈窗
  return (
    <form
      className="flex flex-col gap-4 rounded-lg border border-border-default bg-brand-white p-6 sm:p-8"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-h2 text-text-primary">對本場次學員發公告</h1>
        <p className="text-body-small text-text-secondary">{summary}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Textarea
          label="公告內容（純文字，500 字以內）"
          name="content"
          rows={5}
          disabled={!canSend}
          placeholder="例如：集合地點、裝備、穿著；請勿填寫電話、LINE、Email 或外部連結。"
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setSentMessage(undefined);
          }}
          error={fieldError}
        />
        <p className={`text-caption text-right ${tooLong ? "text-state-error-text" : "text-text-secondary"}`}>
          {length} / {ANNOUNCEMENT_MAX_LENGTH}
        </p>
      </div>

      {!canSend && (
        <p className="text-body-small rounded-md border-[1.5px] border-state-error bg-state-error-bg px-3.5 py-2.5 text-state-error-text">
          這個場次目前沒有報名學員，無法發送公告。
        </p>
      )}

      {sendError && <FormError message={sendError} />}
      {sentMessage && (
        <p
          role="status"
          className="text-body-small rounded-md border border-brand-blue bg-tint-blue-100 px-3.5 py-2.5 text-text-primary"
        >
          {sentMessage}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <Link href={cancelHref} className={buttonClassName("secondary")}>
          取消
        </Link>
        <Button
          type="submit"
          loading={isSending}
          loadingText="發送中"
          disabled={!canSend || isEmpty || invalid}
        >
          發送公告
        </Button>
      </div>
    </form>
  );
}
