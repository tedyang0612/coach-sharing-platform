// 開課進度：左邊「差 N 人開課／已達開課人數」，右邊「已報名／上限 人」，下面一條進度條。
// 設計稿的 Group Progress 是帶圓形旋鈕的滑桿樣式，但設計師註記「人數狀態排版」還在調整，
// 先做文字加進度條的簡單版，排版定案後再對。
export default function GroupProgress({
  enrolled,
  minToOpen,
  capacity,
}: {
  enrolled: number;
  minToOpen: number;
  capacity: number;
}) {
  const reachedMin = enrolled >= minToOpen;
  const percent = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;

  return (
    <div className="space-y-2">
      <div className="text-body flex items-center justify-between">
        <span className="font-bold text-(--color-text-primary)">
          {reachedMin ? "已達開課人數" : `差 ${minToOpen - enrolled} 人開課`}
        </span>
        <span className="text-(--color-text-secondary)">
          <span className="font-(family-name:--font-latin)">
            {enrolled} / {capacity}
          </span>{" "}
          人
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={enrolled}
        aria-label="報名人數"
        className="h-2 w-full overflow-hidden rounded-full bg-(--color-tint-blue-200)"
      >
        <div
          className="h-full rounded-full bg-(--color-brand-blue)"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
