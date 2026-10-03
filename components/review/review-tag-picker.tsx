"use client";

import { REVIEW_TAG_MAX, REVIEW_TAGS } from "@/lib/reviews/review-tags";

type ReviewTagPickerProps = {
  value: string[];
  onChange: (next: string[]) => void;
};

/** 評價 Tag 選擇：點一下選取、再點一下取消，最多選 3 個；讓不想打字的學員也能快速完成評價。 */
export function ReviewTagPicker({ value, onChange }: ReviewTagPickerProps) {
  const isFull = value.length >= REVIEW_TAG_MAX;

  function toggle(tag: string) {
    if (value.includes(tag)) {
      onChange(value.filter((item) => item !== tag));
    } else if (!isFull) {
      onChange([...value, tag]);
    }
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-neutral-800">
        這堂課如何？
        <span className="ml-1 text-xs font-normal text-neutral-500">
          選填，最多 {REVIEW_TAG_MAX} 個（{value.length}/{REVIEW_TAG_MAX}）
        </span>
      </legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {REVIEW_TAGS.map((tag) => {
          const selected = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={selected}
              disabled={!selected && isFull}
              onClick={() => toggle(tag)}
              className={`rounded-full border px-4 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                selected
                  ? "border-brand bg-brand font-semibold text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-brand"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
      {isFull && (
        <p className="text-xs text-neutral-500">
          已選滿 {REVIEW_TAG_MAX} 個，取消一個才能再選。
        </p>
      )}
    </fieldset>
  );
}
