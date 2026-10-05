"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
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
        <div key={license.key} className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="sm:w-1/2">
              <TextField
                label="證照名稱"
                id={`license-name-${license.key}`}
                name={`licenseName-${license.key}`}
                list="license-suggestions"
                placeholder="例：ACE-CPT"
                value={license.name}
                onChange={(event) => update(license.key, { name: event.target.value })}
                error={contactInfoWarning(license.name)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <FileField
                label="檔案"
                name={`licenseFile-${license.key}`}
                kind="document"
                layout="inline"
                file={license.file}
                onChange={(file) => update(license.key, { file })}
              />
            </div>
            <button
              type="button"
              aria-label={`移除證照 ${index + 1}`}
              onClick={() => onChange(value.filter((item) => item.key !== license.key))}
              className="text-label shrink-0 self-end py-3 text-brand-deep underline underline-offset-4 sm:self-start sm:pt-10"
            >
              移除
            </button>
          </div>

          {/* 名稱含聯絡資訊的警示已經顯示在名稱欄位下方，這裡不重複 */}
          {errors?.[index] && !contactInfoWarning(license.name) && (
            <p className="text-caption text-state-error-text">{errors[index]}</p>
          )}
        </div>
      ))}

      <datalist id="license-suggestions">
        {LICENSE_SUGGESTIONS.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <Button type="button" variant="ghost" onClick={add} className="self-start">
        ＋ 新增證照
      </Button>
    </div>
  );
}
