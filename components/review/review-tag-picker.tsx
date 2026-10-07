"use client";

import { Chip } from "@/components/ui/chip";
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
      <legend className="text-label text-text-primary">
        這位教練的特色（選填，最多選 {REVIEW_TAG_MAX} 個）
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {REVIEW_TAGS.map((tag) => {
          const selected = value.includes(tag);
          return (
            <Chip
              key={tag}
              selected={selected}
              disabled={!selected && isFull}
              onClick={() => toggle(tag)}
            >
              {tag}
            </Chip>
          );
        })}
      </div>
      <p className="text-caption text-text-secondary">
        已選 {value.length} / {REVIEW_TAG_MAX} 個，不隨星數變化
      </p>
    </fieldset>
  );
}
