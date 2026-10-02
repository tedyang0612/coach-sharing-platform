"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { submitReview } from "@/app/actions/reviews";
import { StarInput } from "@/components/review/star-input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { contactInfoWarning } from "@/lib/coach-application/validation";

const COMMENT_MAX_LENGTH = 500;

type ReviewFormProps = {
  registrationId: string;
  coachId: string;
  coachName: string;
};

export function ReviewForm({ registrationId, coachId, coachName }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
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
      const result = await submitReview({ registrationId, rating, comment });
      if (result.ok) {
        setDone(true);
      } else {
        setSubmitError(result.error);
      }
    });
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-8 text-center">
        <span
          aria-hidden
          className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-ink text-2xl font-bold text-brand"
        >
          ✓
        </span>
        <div>
          <p className="text-lg font-bold text-neutral-900">評價已送出，謝謝你的回饋！</p>
          <p className="mt-1 text-sm text-neutral-500">
            你的評價會顯示在 {coachName} 的教練個人檔案。
          </p>
        </div>
        <Link
          href={`/coaches/${coachId}`}
          className="rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
        >
          查看教練個人檔案
        </Link>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6"
      noValidate
      onSubmit={handleSubmit}
    >
      <StarInput
        value={rating}
        onChange={setRating}
        error={attempted && rating === 0 ? "請選擇評分" : undefined}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="comment" className="text-sm font-semibold text-neutral-800">
          文字心得（選填）
        </label>
        <p className="text-xs text-neutral-500">
          心得會公開顯示在教練個人檔案，讓其他學員參考。請勿填寫電話、Email、LINE ID 或網址。
        </p>
        <textarea
          id="comment"
          name="comment"
          rows={5}
          placeholder="這堂課的感受、教練的教學方式、適合什麼程度的人…"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          aria-invalid={commentInvalid ? true : undefined}
          className={`rounded-xl border bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:bg-white focus:ring-2 ${
            commentInvalid
              ? "border-red-500 focus:border-red-500 focus:ring-red-100"
              : "border-neutral-200 focus:border-brand focus:ring-brand-ink"
          }`}
        />
        <p className={`text-xs ${commentTooLong ? "text-red-600" : "text-neutral-400"}`}>
          {commentLength}/{COMMENT_MAX_LENGTH}
          {commentTooLong && "，超過字數上限"}
        </p>
        {contactWarning && <p className="text-xs text-red-600">{contactWarning}</p>}
      </div>

      {submitError && <FormError message={submitError} />}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "送出中…" : "送出評價"}
      </Button>
      <p className="text-center text-xs text-neutral-400">每筆訂單只能評價一次，送出後無法修改。</p>
    </form>
  );
}
