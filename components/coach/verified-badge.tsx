const SIZE_CLASSES = {
  // sm：課程卡片上、教練名字旁；md：教練個人檔案標題旁
  sm: { wrapper: "gap-1 py-0.5 pl-1 pr-2 text-[11px]", icon: 16 },
  md: { wrapper: "gap-1.5 py-1 pl-1.5 pr-2.5 text-xs", icon: 20 },
} as const;

// 獎章外圈的花邊：12 個小圓繞一圈
const PETALS = Array.from({ length: 12 }, (_, index) => {
  const angle = (index * Math.PI) / 6;
  return {
    cx: (12 + 7.2 * Math.cos(angle)).toFixed(2),
    cy: (9.5 + 7.2 * Math.sin(angle)).toFixed(2),
  };
});

/** 獎章圖示（自行繪製的 SVG，沒有使用外部圖庫素材）。 */
function RosetteIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      {/* 緞帶 */}
      <path d="M8.2 13.5 4.6 21.6l3.1-.5 1.6 2.6 3-7.2z" className="fill-sky-500" />
      <path d="m15.8 13.5 3.6 8.1-3.1-.5-1.6 2.6-3-7.2z" className="fill-sky-500" />
      {/* 花邊與獎章 */}
      {PETALS.map((petal) => (
        <circle key={`${petal.cx}-${petal.cy}`} cx={petal.cx} cy={petal.cy} r="2.1" className="fill-amber-400" />
      ))}
      <circle cx="12" cy="9.5" r="7.4" className="fill-amber-400" />
      <circle cx="12" cy="9.5" r="5.4" className="fill-amber-300" />
      <path
        d="m9.4 9.7 1.9 1.9 3.4-3.7"
        fill="none"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-white"
      />
    </svg>
  );
}

/**
 * 「已認證」徽章（PRD 4.0 規格 4）：教練只要有一張證照審核通過就顯示。
 * 滑鼠停在上面會顯示「認證教練」。
 * 要不要顯示由呼叫端決定，例如：{coach.is_verified && <VerifiedBadge />}
 */
export function VerifiedBadge({ size = "sm" }: { size?: keyof typeof SIZE_CLASSES }) {
  const config = SIZE_CLASSES[size];
  return (
    <span
      title="認證教練"
      className={`inline-flex shrink-0 items-center rounded-full bg-brand-ink font-bold text-brand ${config.wrapper}`}
    >
      <RosetteIcon size={config.icon} />
      已認證
    </span>
  );
}
