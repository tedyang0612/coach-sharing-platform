/**
 * 評價 Tag（PRD 5.0，v4.5）：學員評價時可以點選，最多 3 個，不隨星數變化。
 *
 * 資料庫的 reviews 只有 rating 與 comment 兩個內容欄位，所以 Tag 和文字心得一起存在 comment：
 * 有選 Tag 時第一行是「【評價標籤】非常專業、適合新手」，後面才是文字心得。
 * 寫入請用 formatReviewComment()，顯示請用 parseReviewComment()，不要自己拆字串。
 */

export const REVIEW_TAGS = [
  "非常專業",
  "氣氛輕鬆",
  "適合新手",
  "細節魔人",
  "課程充實",
  "會想再上",
  "歡樂紓壓",
  "超有耐心",
] as const;

export const REVIEW_TAG_MAX = 3;

const MARKER = "【評價標籤】";
const SEPARATOR = "、";

/** 只留清單內的 Tag、去掉重複，最多 REVIEW_TAG_MAX 個。 */
export function sanitizeReviewTags(tags: string[]): string[] {
  const allowed = REVIEW_TAGS as readonly string[];
  return [...new Set(tags)].filter((tag) => allowed.includes(tag)).slice(0, REVIEW_TAG_MAX);
}

/** 把 Tag 與文字心得組成要存進 reviews.comment 的內容；兩者都沒有時回傳 null。 */
export function formatReviewComment(tags: string[], text: string): string | null {
  const cleanTags = sanitizeReviewTags(tags);
  const cleanText = text.trim();
  const lines: string[] = [];
  if (cleanTags.length > 0) lines.push(MARKER + cleanTags.join(SEPARATOR));
  if (cleanText) lines.push(cleanText);
  return lines.length > 0 ? lines.join("\n") : null;
}

/** 把 reviews.comment 還原成 Tag 與文字心得；沒有 Tag 的舊資料整段當成文字心得。 */
export function parseReviewComment(comment: string | null): { tags: string[]; text: string } {
  if (!comment) return { tags: [], text: "" };
  if (!comment.startsWith(MARKER)) return { tags: [], text: comment };

  const newline = comment.indexOf("\n");
  const tagLine = newline === -1 ? comment : comment.slice(0, newline);
  const text = newline === -1 ? "" : comment.slice(newline + 1);
  const tags = sanitizeReviewTags(tagLine.slice(MARKER.length).split(SEPARATOR));
  return { tags, text };
}

/**
 * 找出被點選最多次的 Tag（教練個人檔案的平均星級旁顯示用）。
 * 次數相同時取 REVIEW_TAGS 清單中排在前面的；沒有人點選過則回傳 null。
 */
export function topReviewTag(comments: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const comment of comments) {
    for (const tag of parseReviewComment(comment).tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const tag of REVIEW_TAGS) {
    const count = counts.get(tag) ?? 0;
    if (count > bestCount) {
      best = tag;
      bestCount = count;
    }
  }
  return best;
}
