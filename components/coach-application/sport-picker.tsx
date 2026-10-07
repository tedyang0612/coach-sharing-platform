"use client";

import { Chip } from "@/components/ui/chip";
import { SPORT_CATEGORIES } from "@/lib/coach-application/constants";

type SportPickerProps = {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
};

/** 運動類別複選：點一下選取、再點一下取消（設計稿 C01 的 Chip 列）。 */
export function SportPicker({ value, onChange, error }: SportPickerProps) {
  function toggle(sport: string) {
    onChange(
      value.includes(sport) ? value.filter((item) => item !== sport) : [...value, sport]
    );
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-label text-text-primary">
        運動類別（可複選）<span className="ml-0.5 text-state-error">*</span>
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {SPORT_CATEGORIES.map((sport) => (
          <Chip key={sport} selected={value.includes(sport)} onClick={() => toggle(sport)}>
            {sport}
          </Chip>
        ))}
      </div>
      {error && <p data-field-error className="text-caption text-state-error-text">{error}</p>}
    </fieldset>
  );
}
