"use client";

import { useRef } from "react";
import { TextField } from "@/components/ui/text-field";
import { LICENSE_SUGGESTIONS } from "@/lib/coach-application/constants";
import { contactInfoWarning } from "@/lib/coach-application/validation";
import { FileField } from "./file-field";

export type LicenseDraft = {
  // 只用來當畫面清單的 key，不會存進資料庫
  key: number;
  name: string;
  file: File | null;
};

type LicenseListProps = {
  value: LicenseDraft[];
  onChange: (next: LicenseDraft[]) => void;
  // 送出檢查後的錯誤，key 是證照在清單裡的位置
  errors?: Record<number, string>;
};

/** 專業證照：選填、不限張數，每張要有名稱與檔案（PRD 4.0 AC 7）。 */
export function LicenseList({ value, onChange, errors }: LicenseListProps) {
  const nextKey = useRef(0);

  function add() {
    nextKey.current += 1;
    onChange([...value, { key: nextKey.current, name: "", file: null }]);
  }

  function update(key: number, patch: Partial<LicenseDraft>) {
    onChange(value.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  return (
    <div className="flex flex-col gap-4">
      {value.map((license, index) => (
        <div
          key={license.key}
          className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-800">
              證照 {index + 1}
            </span>
            <button
              type="button"
              onClick={() => onChange(value.filter((item) => item.key !== license.key))}
              className="text-sm font-semibold text-brand hover:underline"
            >
              移除
            </button>
          </div>

          <TextField
            label="證照名稱＊"
            id={`license-name-${license.key}`}
            name={`licenseName-${license.key}`}
            list="license-suggestions"
            placeholder="例：ACE-CPT（可輸入或從建議選擇）"
            value={license.name}
            onChange={(event) => update(license.key, { name: event.target.value })}
            error={contactInfoWarning(license.name)}
          />

          <FileField
            label="證照檔案＊"
            name={`licenseFile-${license.key}`}
            kind="document"
            file={license.file}
            onChange={(file) => update(license.key, { file })}
          />

          {/* 名稱含聯絡資訊的警示已經顯示在名稱欄位下方，這裡不重複 */}
          {errors?.[index] && !contactInfoWarning(license.name) && (
            <p className="text-xs text-red-600">{errors[index]}</p>
          )}
        </div>
      ))}

      <datalist id="license-suggestions">
        {LICENSE_SUGGESTIONS.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <button
        type="button"
        onClick={add}
        className="self-start rounded-xl border border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-ink"
      >
        ＋ 新增證照
      </button>
    </div>
  );
}
