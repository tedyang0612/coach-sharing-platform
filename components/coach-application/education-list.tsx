"use client";

import { useRef } from "react";
import {
  DEFAULT_EDUCATION_DEGREE,
  EDUCATION_DEGREES,
} from "@/lib/coach-application/education";
import { contactInfoWarning } from "@/lib/coach-application/validation";

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

const FIELD_CLASS =
  "rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-ink";

/** 個人學歷：必填、可新增多筆，每筆是「學位」下拉選單＋「學校科系」。 */
export function EducationList({ value, onChange, error, itemErrors }: EducationListProps) {
  // 從目前清單的最大 key 往上編，補件重送時帶入的舊資料才不會撞號
  const nextKey = useRef(Math.max(0, ...value.map((item) => item.key)));

  function add() {
    nextKey.current += 1;
    onChange([...value, { key: nextKey.current, degree: DEFAULT_EDUCATION_DEGREE, school: "" }]);
  }

  function update(key: number, patch: Partial<EducationDraft>) {
    onChange(value.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-neutral-800">個人學歷＊</legend>

      <div className="mt-1.5 flex flex-col gap-3">
        {value.map((item, index) => {
          // 學校科系是公開欄位，邊打字邊檢查聯絡資訊
          const message = contactInfoWarning(item.school) ?? itemErrors?.[index];
          return (
            <div key={item.key} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <select
                  aria-label={`學歷 ${index + 1} 的學位`}
                  value={item.degree}
                  onChange={(event) => update(item.key, { degree: event.target.value })}
                  className={`${FIELD_CLASS} w-32 shrink-0`}
                >
                  {EDUCATION_DEGREES.map((degree) => (
                    <option key={degree} value={degree}>
                      {degree}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`學歷 ${index + 1} 的學校科系`}
                  value={item.school}
                  placeholder="例：臺北市立大學水上運動學系"
                  onChange={(event) => update(item.key, { school: event.target.value })}
                  className={`${FIELD_CLASS} min-w-0 flex-1`}
                />
                {value.length > 1 && (
                  <button
                    type="button"
                    aria-label={`移除學歷 ${index + 1}`}
                    onClick={() => onChange(value.filter((other) => other.key !== item.key))}
                    className="shrink-0 text-sm font-semibold text-brand hover:underline"
                  >
                    移除
                  </button>
                )}
              </div>
              {message && <p className="text-xs text-red-600">{message}</p>}
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={add}
        className="self-start rounded-xl border border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-ink"
      >
        ＋ 新增學歷
      </button>
    </fieldset>
  );
}
