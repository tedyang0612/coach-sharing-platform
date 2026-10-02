"use client";

import { SPORT_CATEGORIES } from "@/lib/coach-application/constants";

type SportPickerProps = {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
};

/** 運動類別複選：點一下選取、再點一下取消。 */
export function SportPicker({ value, onChange, error }: SportPickerProps) {
  function toggle(sport: string) {
    onChange(
      value.includes(sport) ? value.filter((item) => item !== sport) : [...value, sport]
    );
  }

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-semibold text-neutral-800">
        運動類別＊
        <span className="ml-1 text-xs font-normal text-neutral-500">可複選</span>
      </legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {SPORT_CATEGORIES.map((sport) => {
          const selected = value.includes(sport);
          return (
            <button
              key={sport}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(sport)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                selected
                  ? "border-brand bg-brand font-semibold text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-brand"
              }`}
            >
              {sport}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}
