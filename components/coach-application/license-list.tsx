"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { LICENSE_SUGGESTIONS } from "@/lib/coach-application/constants";
import {
  contactInfoWarning,
  LICENSE_NAME_MAX_LENGTH,
  maxLengthError,
} from "@/lib/coach-application/validation";
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
          className="flex flex-col gap-3 rounded-md border border-border-default p-4"
        >
          {/* 「移除」放在框內的標題列，檔名再長也不會被擠到欄位外面（QA 回饋） */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-label text-text-secondary">證照 {index + 1}</span>
            <button
              type="button"
              aria-label={`移除證照 ${index + 1}`}
              onClick={() => onChange(value.filter((item) => item.key !== license.key))}
              className="text-label shrink-0 text-brand-deep underline underline-offset-4"
            >
              移除
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="證照名稱"
              required
              id={`license-name-${license.key}`}
              name={`licenseName-${license.key}`}
              list="license-suggestions"
              placeholder="例：ACE-CPT"
              value={license.name}
              onChange={(event) => update(license.key, { name: event.target.value })}
              hint={`最多 ${LICENSE_NAME_MAX_LENGTH} 個字`}
              error={
                contactInfoWarning(license.name) ??
                maxLengthError(license.name, LICENSE_NAME_MAX_LENGTH, "證照名稱")
              }
            />
            <div className="min-w-0">
              <FileField
                label="檔案"
                required
                name={`licenseFile-${license.key}`}
                kind="document"
                layout="inline"
                file={license.file}
                onChange={(file) => update(license.key, { file })}
              />
            </div>
          </div>

          {/* 名稱含聯絡資訊的警示已經顯示在名稱欄位下方，這裡不重複 */}
          {errors?.[index] &&
            !contactInfoWarning(license.name) &&
            !maxLengthError(license.name, LICENSE_NAME_MAX_LENGTH, "證照名稱") && (
            <p data-field-error className="text-caption text-state-error-text">
              {errors[index]}
            </p>
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
