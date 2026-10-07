type CoachTagsProps = {
  tags: string[];
  // 課程卡片空間小，可以只顯示前幾個，其餘用「+N」表示；不傳就全部顯示（教練個人檔案）
  max?: number;
};

/** 教練特色 Tag 顯示（PRD 2.0 規格 3、9.0 規格 1）；教練最多有 5 個 Tag。 */
export function CoachTags({ tags, max }: CoachTagsProps) {
  if (tags.length === 0) return null;

  const shown = max === undefined ? tags : tags.slice(0, max);
  const hiddenCount = tags.length - shown.length;

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="教練特色">
      {shown.map((tag) => (
        <li
          key={tag}
          className="text-caption rounded-pill bg-tint-blue-100 px-2 py-1 text-text-primary"
        >
          {tag}
        </li>
      ))}
      {hiddenCount > 0 && (
        <li className="text-caption rounded-pill px-1 py-1 text-text-secondary">
          <span aria-hidden>+{hiddenCount}</span>
          <span className="sr-only">另外還有 {hiddenCount} 個</span>
        </li>
      )}
    </ul>
  );
}
