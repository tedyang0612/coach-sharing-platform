"use client";

import { useState, type KeyboardEvent } from "react";
import {
  PRESET_TAG_GROUPS,
  TAG_MAX_COUNT,
  TAG_MAX_LENGTH,
} from "@/lib/coach-application/constants";
import { buttonClassName } from "@/components/ui/button";
import { FIELD_CLASSES } from "@/components/ui/field-styles";
import { contactInfoWarning } from "@/lib/coach-application/validation";

type TagInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
};

/**
 * 特色 Tag：自由輸入（Enter 新增），下方依分類列出平台預設 Tag 當建議，打字時只留符合的。
 * 上限 5 個、每個 10 字、不可含聯絡資訊（PRD 9.0 規格 1、第六章 7）。
 */
export function TagInput({ value, onChange }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();

  const isFull = value.length >= TAG_MAX_COUNT;
  const keyword = draft.trim();
  // 邊打字邊檢查字數，超過上限就立刻變紅框並提示，不用等到按「新增」
  const isTooLong = Array.from(keyword).length > TAG_MAX_LENGTH;
  const shownError = isTooLong ? `每個特色 Tag 最多 ${TAG_MAX_LENGTH} 個字` : error;

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    if (isFull) return setError(`特色 Tag 最多 ${TAG_MAX_COUNT} 個`);
    if (Array.from(tag).length > TAG_MAX_LENGTH) {
      return setError(`每個特色 Tag 最多 ${TAG_MAX_LENGTH} 個字`);
    }
    if (value.includes(tag)) return setError(`已經加過「${tag}」了`);
    const warning = contactInfoWarning(tag);
    if (warning) return setError(warning);

    onChange([...value, tag]);
    setDraft("");
    setError(undefined);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // 中文輸入法選字時也會送出 Enter，選字中不要當成新增
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      addTag(draft);
    }
  }

  const suggestionGroups = PRESET_TAG_GROUPS.map((group) => ({
    label: group.label,
    tags: group.tags.filter(
      (tag) => !value.includes(tag) && (!keyword || tag.includes(keyword))
    ),
  })).filter((group) => group.tags.length > 0);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="tag-input" className="text-label text-text-primary">
        特色 Tag（選填，最多 {TAG_MAX_COUNT} 個、每個 {TAG_MAX_LENGTH} 字）
        <span className="text-caption ml-2 text-text-secondary">
          已選 {value.length}／{TAG_MAX_COUNT}
        </span>
      </label>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <li
              key={tag}
              className="text-label flex items-center gap-1 rounded-pill border border-brand-blue bg-tint-blue-200 py-1.5 pl-3.5 pr-2 text-text-primary"
            >
              {tag}
              <button
                type="button"
                aria-label={`移除 ${tag}`}
                onClick={() => onChange(value.filter((item) => item !== tag))}
                className="flex size-5 items-center justify-center rounded-pill hover:bg-brand-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          id="tag-input"
          value={draft}
          disabled={isFull}
          placeholder={isFull ? "已達上限" : "輸入後按 Enter 新增，或點選下方建議"}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(undefined);
          }}
          onKeyDown={handleKeyDown}
          aria-invalid={shownError ? true : undefined}
          className={`${FIELD_CLASSES} min-w-0 flex-1`}
        />
        <button
          type="button"
          disabled={isFull || !keyword || isTooLong}
          onClick={() => addTag(draft)}
          className={`${buttonClassName("secondary")} shrink-0 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-state-disabled-bg disabled:text-state-disabled-text`}
        >
          新增
        </button>
      </div>
      {shownError && <p className="text-caption text-state-error-text">{shownError}</p>}

      {!isFull && suggestionGroups.length > 0 && (
        <div className="mt-1 flex flex-col gap-2 rounded-md bg-brand-light p-3">
          {suggestionGroups.map((group) => (
            <div key={group.label} className="flex flex-wrap items-center gap-1.5">
              <span className="text-caption w-16 shrink-0 text-text-secondary">{group.label}</span>
              {group.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="text-caption rounded-pill border border-border-default bg-brand-white px-3 py-1 text-text-primary transition hover:border-brand-blue"
                >
                  {tag}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
