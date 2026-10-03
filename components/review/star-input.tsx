"use client";

type StarInputProps = {
  value: number;
  onChange: (rating: number) => void;
  error?: string;
};

const LABELS = ["", "很不滿意", "不滿意", "普通", "滿意", "非常滿意"];

/** 評價用的星等選擇：點第幾顆就是幾星（1–5）。用單選按鈕做，鍵盤方向鍵也能操作。 */
export function StarInput({ value, onChange, error }: StarInputProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-neutral-800">整體評分＊</legend>
      <div className="mt-1.5 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <label key={rating} className="cursor-pointer rounded-lg p-1 hover:bg-neutral-100">
            <input
              type="radio"
              name="rating"
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
              className="peer sr-only"
            />
            <span className="sr-only">{rating} 星</span>
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={`rounded peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand ${
                rating <= value ? "fill-amber-400" : "fill-neutral-200"
              }`}
            >
              <path d="m12 2 3.1 6.6 7 .9-5.1 5 1.3 7.1L12 18.2l-6.3 3.4L7 14.5l-5.1-5 7-.9z" />
            </svg>
          </label>
        ))}
        {value > 0 && (
          <span className="ml-2 text-sm text-neutral-600">
            {value} 星・{LABELS[value]}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}
