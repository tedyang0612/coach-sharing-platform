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
  // 送出檢查後的錯誤：error 是整體（例如一筆都沒填），itemErrors 的 key 是清單位置
  error?: string;
  itemErrors?: Record<number, string>;
};

// 「＋ 新增學歷」放在卡片標題列右邊（設計稿 C01），所以新增的動作由外層呼叫
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
export function EducationList({ value, onChange, error, itemErrors }: EducationListProps) {
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
            {value.length > 1 && (
              <button
                type="button"
                aria-label={`移除學歷 ${index + 1}`}
                onClick={() => onChange(value.filter((other) => other.key !== item.key))}
                className="text-label shrink-0 self-end py-3 text-brand-deep underline underline-offset-4 sm:self-start sm:pt-10"
              >
                移除
              </button>
            )}
          </div>
        );
      })}
      {error && <p data-field-error className="text-caption text-state-error-text">{error}</p>}
    </div>
  );
}
