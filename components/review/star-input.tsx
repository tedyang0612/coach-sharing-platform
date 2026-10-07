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
      <legend className="text-label text-text-primary">整體評分（必填）</legend>
      <div className="mt-2 flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((rating) => (
          <label key={rating} className="cursor-pointer rounded-sm p-1 hover:bg-tint-blue-100">
            <input
              type="radio"
              name="rating"
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
              className="peer sr-only"
            />
            <span className="sr-only">{rating} 星</span>
            {/* 設計稿的星星是 16px；這裡是要讓人點的，放大到好按的尺寸，顏色照設計稿用天空藍 */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={`rounded-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand-blue ${
                rating <= value ? "fill-brand-blue" : "fill-tint-blue-200"
              }`}
            >
              <path d="m12 2 3.1 6.6 7 .9-5.1 5 1.3 7.1L12 18.2l-6.3 3.4L7 14.5l-5.1-5 7-.9z" />
            </svg>
          </label>
        ))}
        {value > 0 && (
          <span className="text-body-small ml-2 text-text-secondary">
            {value} 星・{LABELS[value]}
          </span>
        )}
      </div>
      {error && <p className="text-caption text-state-error-text">{error}</p>}
    </fieldset>
  );
}
