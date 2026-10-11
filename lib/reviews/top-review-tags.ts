import { parseReviewComment, REVIEW_TAGS } from "./review-tags";

/**
 * 被點選次數最多的前幾個評價 Tag（PRD 9.0 規格 3，v4.8：由 1 個改為前 3 個）。
 * 依次數由多到少；次數相同時照 REVIEW_TAGS 清單的順序；沒有人點選過的不列入。
 */
export function topReviewTags(comments: (string | null)[], limit = 3): string[] {
  const counts = new Map<string, number>();
  for (const comment of comments) {
    for (const tag of parseReviewComment(comment).tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return REVIEW_TAGS.filter((tag) => (counts.get(tag) ?? 0) > 0)
    .map((tag, order) => ({ tag, order, count: counts.get(tag) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, limit)
    .map((item) => item.tag);
}
