"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { submitReview } from "@/app/actions/reviews";
import { ReviewTagPicker } from "@/components/review/review-tag-picker";
import { StarInput } from "@/components/review/star-input";
import { Button, buttonClassName } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Textarea } from "@/components/ui/textarea";
import { contactInfoWarning } from "@/lib/coach-application/validation";

const COMMENT_MAX_LENGTH = 500;

type ReviewFormProps = {
  registrationId: string;
  coachId: string;
  coachName: string;
  // 卡片標題下方那一行：課名・教練・上課時間
  summary: string;
};

export function ReviewForm({ registrationId, coachId, coachName, summary }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [done, setDone] = useState(false);
  const [isSubmitting, startSubmit] = useTransition();

  const commentLength = Array.from(comment.trim()).length;
  const commentTooLong = commentLength > COMMENT_MAX_LENGTH;
  // 心得是公開內容，邊打字邊檢查聯絡資訊（電話、Email、LINE ID、網址、@帳號）
  const contactWarning = contactInfoWarning(comment);
  const commentInvalid = commentTooLong || contactWarning !== undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setSubmitError(undefined);
    if (rating === 0 || commentInvalid) return;

    startSubmit(async () => {
      const result = await submitReview({ registrationId, rating, tags, comment });
      if (result.ok) {
        setDone(true);
      } else {
        setSubmitError(result.error);
      }
    });
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border-default bg-brand-white p-8 text-center">
        <span
          aria-hidden
          className="text-h2 flex size-14 items-center justify-center rounded-pill bg-tint-blue-100 text-text-primary"
        >
          ✓
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-h3 text-text-primary">評價已送出，謝謝你的回饋！</p>
          <p className="text-body-small text-text-secondary">
            你的評價會顯示在 {coachName} 的教練個人檔案。
          </p>
        </div>
        <Link href={`/coaches/${coachId}`} className={buttonClassName("primary")}>
          查看教練個人檔案
        </Link>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5 rounded-lg border border-border-default bg-brand-white px-5 py-6 sm:p-10"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-h2 text-text-primary">評價這堂課</h1>
        <p className="text-body-small text-text-secondary">{summary}</p>
      </div>

      <StarInput
        value={rating}
        onChange={setRating}
        error={attempted && rating === 0 ? "請選擇評分" : undefined}
      />

      <ReviewTagPicker value={tags} onChange={setTags} />

      <div className="flex flex-col gap-1.5">
        <Textarea
          label="文字心得（選填，500 字以內，會公開顯示）"
          name="comment"
          rows={4}
          placeholder="這堂課的感受、教練的教學方式、適合什麼程度的人…"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          aria-invalid={commentInvalid ? true : undefined}
        />
        <p
          className={`text-caption text-right ${commentTooLong ? "text-state-error-text" : "text-text-secondary"}`}
        >
          {commentLength} / {COMMENT_MAX_LENGTH}
          {commentTooLong && "，超過字數上限"}
        </p>
      </div>

      {contactWarning && (
        <p className="text-body-small rounded-md border-[1.5px] border-state-error bg-state-error-bg px-3.5 py-2.5 text-state-error-text">
          偵測到聯絡資訊（電話、Email、LINE ID、網址或「@帳號」），請移除後再送出。
        </p>
      )}

      {submitError && <FormError message={submitError} />}

      <div className="flex gap-3">
        <Link href="/my-courses" className={buttonClassName("secondary", true)}>
          稍後再評
        </Link>
        <Button
          type="submit"
          fullWidth
          loading={isSubmitting}
          loadingText="送出中"
          disabled={commentInvalid}
        >
          送出評價
        </Button>
      </div>
      <p className="text-caption text-center text-text-secondary">
        每筆訂單只能評價一次，送出後無法修改。
      </p>
    </form>
  );
}
