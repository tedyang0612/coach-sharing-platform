function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={filled ? "fill-amber-400" : "fill-neutral-200"}
    >
      <path d="m12 2 3.1 6.6 7 .9-5.1 5 1.3 7.1L12 18.2l-6.3 3.4L7 14.5l-5.1-5 7-.9z" />
    </svg>
  );
}

/** 單則評價的星等：1–5 顆實心星。 */
export function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} 星`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} filled={value <= rating} size={size} />
      ))}
    </span>
  );
}

/**
 * 教練的評價摘要：平均星級＋評價數。
 * 還沒有評價時顯示「尚無評價」，不顯示 0 分（PRD 9.0 AC 2）。
 */
export function RatingSummary({
  average,
  count,
}: {
  average: number | null;
  count: number;
}) {
  if (average === null || count === 0) {
    return <span className="text-sm text-neutral-500">尚無評價</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-neutral-700">
      <Star filled size={16} />
      <span className="font-bold text-neutral-900">{average.toFixed(1)}</span>
      <span className="text-neutral-500">（{count} 則評價）</span>
    </span>
  );
}
