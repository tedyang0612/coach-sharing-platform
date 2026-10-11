import Link from "next/link";
import { ArrowRightIcon, StarIcon } from "@/components/goland/icons";

const MAX_VISIBLE_TAGS = 3;

// 授課教練卡：整張卡連到教練個人檔案。
// 頭像用大頭貼（photo_url），沒有就顯示淡藍圓形。
export default function CoachMini({
  href,
  name,
  photoUrl,
  verified,
  rating,
  reviewCount,
  tags,
}: {
  href: string;
  name: string;
  photoUrl: string | null;
  verified: boolean;
  rating: number | null;
  reviewCount: number;
  tags: string[];
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-(--radius-lg) border border-(--color-border-default) bg-(--color-surface-default) p-4 transition-shadow hover:shadow-(--shadow-md)"
    >
      {photoUrl ? (
        // 大頭貼來自 Supabase Storage，用一般 img，不需要設定 next/image 的來源網域
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover md:h-20 md:w-20" />
      ) : (
        <span
          aria-hidden="true"
          className="h-16 w-16 shrink-0 rounded-full bg-(--color-tint-blue-200) md:h-20 md:w-20"
        />
      )}

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-h3 truncate">{name}</span>
          {verified && (
            <span className="text-caption rounded-full bg-(--color-tint-blue-100) px-3 py-0.5">
              已認證
            </span>
          )}
        </div>
        <p className="text-body-small flex items-center gap-1.5 text-(--color-text-secondary)">
          {rating !== null ? (
            <>
              <StarIcon size={14} />
              <span>
                <span className="font-(family-name:--font-latin)">{rating.toFixed(1)}</span>
                （{reviewCount} 則評價）
              </span>
            </>
          ) : (
            "尚無評價"
          )}
        </p>
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
              <li
                key={tag}
                className="text-caption rounded-full border border-(--color-border-default) px-3 py-0.5"
              >
                {tag}
              </li>
            ))}
            {tags.length > MAX_VISIBLE_TAGS && (
              <li className="text-caption rounded-full border border-(--color-border-default) px-3 py-0.5 text-(--color-text-secondary)">
                +{tags.length - MAX_VISIBLE_TAGS}
              </li>
            )}
          </ul>
        )}
      </div>

      <span className="shrink-0 text-(--color-text-primary)">
        <ArrowRightIcon size={20} />
        <span className="sr-only">查看教練個人檔案</span>
      </span>
    </Link>
  );
}
