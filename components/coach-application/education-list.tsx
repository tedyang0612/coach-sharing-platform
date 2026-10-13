"use client";

import { useRef } from "react";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import {
  DEFAULT_EDUCATION_DEGREE,
  EDUCATION_DEGREES,
} from "@/lib/coach-application/education";
import {
  contactInfoWarning,
  maxLengthError,
  SCHOOL_MAX_LENGTH,
} from "@/lib/coach-application/validation";

export type EducationDraft = {
  // 只用來當畫面清單的 key，不會存進資料庫
  key: number;
  degree: string;
  school: string;
};

type EducationListProps = {
  value: EducationDraft[];
  onChange: (next: EducationDraft[]) => void;
  // 新增一筆（useEducationAdder 回傳的函式）：桌機放在第一列尾端，手機放在清單下方
  // 沒傳（教練資料管理頁）就維持舊樣式：新增鈕在卡片標題列，每列尾端只有「移除」
  onAdd?: () => void;
  // 送出檢查後的錯誤：error 是整體（例如一筆都沒填），itemErrors 的 key 是清單位置
  error?: string;
  itemErrors?: Record<number, string>;
};

// 新增的動作由外層建立（key 要跨元件記住），再用 onAdd 傳進來
export function useEducationAdder(
  value: EducationDraft[],
  onChange: (next: EducationDraft[]) => void
) {
  // 從目前清單的最大 key 往上編，補件重送時帶入的舊資料才不會撞號
  const nextKey = useRef(Math.max(0, ...value.map((item) => item.key)));
  return function add() {
    nextKey.current += 1;
    onChange([...value, { key: nextKey.current, degree: DEFAULT_EDUCATION_DEGREE, school: "" }]);
  };
}

/** 個人學歷：必填、可新增多筆，每筆是「學位」下拉選單＋「學校科系」。 */
export function EducationList({ value, onChange, onAdd, error, itemErrors }: EducationListProps) {
  function update(key: number, patch: Partial<EducationDraft>) {
    onChange(value.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  return (
    <div className="flex flex-col gap-3">
      {value.map((item, index) => {
        // 學校科系是公開欄位，邊打字邊檢查聯絡資訊
        const message =
          contactInfoWarning(item.school) ??
          maxLengthError(item.school, SCHOOL_MAX_LENGTH, "學校科系") ??
          itemErrors?.[index];
        return (
          <div key={item.key} className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="sm:w-1/2">
              <Select
                label="學位"
                required
                id={`education-degree-${item.key}`}
                value={item.degree}
                onChange={(event) => update(item.key, { degree: event.target.value })}
              >
                {EDUCATION_DEGREES.map((degree) => (
                  <option key={degree} value={degree}>
                    {degree}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-0 flex-1">
              <TextField
                label="學校科系"
                required
                id={`education-school-${item.key}`}
                value={item.school}
                placeholder="請輸入學校科系"
                hint={`最多 ${SCHOOL_MAX_LENGTH} 個字`}
                onChange={(event) => update(item.key, { school: event.target.value })}
                error={message}
              />
            </div>
            {/* 1013 設計稿：第一列尾端「＋ 新增」，之後各列尾端「－ 移除」（手機版新增改放清單下方） */}
            {onAdd && index === 0 ? (
              <button
                type="button"
                onClick={onAdd}
                className="text-label hidden shrink-0 items-center py-3 text-brand-deep sm:flex sm:pt-10"
              >
                ＋ 新增
              </button>
            ) : (onAdd || value.length > 1) && (
              <button
                type="button"
                aria-label={`移除學歷 ${index + 1}`}
                onClick={() => onChange(value.filter((other) => other.key !== item.key))}
                className={
                  onAdd
                    ? "text-label shrink-0 self-start py-3 text-brand-deep sm:pt-10"
                    : "text-label shrink-0 self-end py-3 text-brand-deep underline underline-offset-4 sm:self-start sm:pt-10"
                }
              >
                {onAdd ? "－ 移除" : "移除"}
              </button>
            )}
          </div>
        );
      })}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="text-label flex w-fit items-center py-2 text-brand-deep sm:hidden"
        >
          ＋ 新增學歷
        </button>
      )}
      {error && <p data-field-error className="text-caption text-state-error-text">{error}</p>}
    </div>
  );
}
