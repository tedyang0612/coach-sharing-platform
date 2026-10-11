import type { EducationEntry } from "@/lib/coach-application/education";
import type { Course } from "@/lib/courses/types";
import ShareButton from "@/components/share/ShareButton";
import { Badge } from "@/components/ui/badge";
import { CoachCourseList } from "./coach-course-list";
import { StarRating } from "./star-rating";
import { VerifiedBadge } from "./verified-badge";

export type CoachProfileData = {
  name: string;
  photoUrl: string;
  // 生活／運動照片；較早通過審核的教練可能還沒有
  lifestylePhotoUrl: string | null;
  isVerified: boolean;
  sportCategories: string[];
  tags: string[];
  education: EducationEntry[];
  workExperience: string;
  competition: string;
  intro: string;
  // 已通過審核的證照名稱
  licenseNames: string[];
  avgRating: number | null;
  reviewCount: number;
  // 被點選次數最多的前 3 個評價 Tag，顯示在平均星級旁；沒有人點選過則為空陣列
  topReviewTags: string[];
  reviews: {
    id: string;
    rating: number;
    // 學員點選的評價 Tag
    tags: string[];
    // 文字心得（不含 Tag）
    comment: string;
    reviewerName: string;
    createdAt: string;
  }[];
  // 還能報名的場次（招生中、已確定開課且尚未開始），一筆是一個場次
  courses: Course[];
};

// 時間一律指定台灣時區顯示（CLAUDE.md 時間與時區慣例）；用 formatToParts 自己組字串，
// 伺服器與瀏覽器產生的文字才會完全一樣
function formatTaipeiDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}/${get("month")}/${get("day")}`;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border-default bg-brand-white p-5">
      <h2 className="text-h3 text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-text-secondary">{label}</dt>
      <dd className="text-body-small whitespace-pre-line text-text-primary">{children}</dd>
    </div>
  );
}

/**
 * 教練個人檔案的畫面（設計稿 S12；PRD 9.0）。只負責顯示，資料由頁面查好傳進來。
 * 這裡不會收到、也不會顯示教練的聯絡方式（PRD 4.0 AC 4）。
 * 桌機：左欄（關於教練、證照、評價）＋右欄（招生中的課程）；
 * 手機：個人資料 → 關於教練 → 證照 → 招生中的課程 → 評價。
 */
export function CoachProfileView({ coach }: { coach: CoachProfileData }) {
  const hasRating = coach.avgRating !== null && coach.reviewCount > 0;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-6 rounded-lg border border-border-default bg-brand-white p-5 sm:flex-row sm:items-center sm:p-8">
        {/* 教練上傳到 Storage 的公開照片；next/image 要另外在共用的 next.config.ts 設定網域，這裡先用 img */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coach.photoUrl}
          alt={`${coach.name} 的大頭貼`}
          className="size-[88px] shrink-0 rounded-pill bg-tint-blue-200 object-cover sm:size-[140px]"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-h1 text-text-primary">{coach.name}</h1>
            {coach.isVerified && <VerifiedBadge size="md" />}
          </div>

          {hasRating ? (
            <div className="flex flex-wrap items-center gap-2">
              <StarRating rating={Math.round(coach.avgRating ?? 0)} size={16} />
              <span className="text-body font-medium text-text-primary">
                {(coach.avgRating ?? 0).toFixed(1)}
              </span>
              <span className="text-body-small text-text-secondary">（{coach.reviewCount} 則評價）</span>
              {coach.topReviewTags.length > 0 && (
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-caption text-text-secondary">最多人點選：</span>
                  {coach.topReviewTags.map((tag) => (
                    <Badge key={tag} type="info">
                      {tag}
                    </Badge>
                  ))}
                </span>
              )}
            </div>
          ) : (
            <p className="text-body-small text-text-secondary">尚無評價</p>
          )}

          {coach.sportCategories.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="運動類別">
              {coach.sportCategories.map((sport) => (
                <li key={sport}>
                  <Badge type="neutral">{sport}</Badge>
                </li>
              ))}
            </ul>
          )}

          {coach.tags.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="教練特色">
              {coach.tags.map((tag) => (
                <li key={tag}>
                  <Badge type="info">{tag}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 分享（PRD 9.0 規格 6、10.0）：元件是小柔的，沒傳 path 時分享目前這一頁的網址 */}
        <div className="shrink-0 self-start sm:self-center">
          <ShareButton title={`${coach.name}｜夠練 GoLand`} />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-4 rounded-lg border border-border-default bg-brand-white p-5 sm:flex-row sm:gap-9">
            {coach.lifestylePhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coach.lifestylePhotoUrl}
                alt={`${coach.name} 的生活／運動照片`}
                className="h-[280px] w-full shrink-0 rounded-lg bg-tint-blue-200 object-cover sm:h-[380px] sm:w-[280px]"
              />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <h2 className="text-h3 text-text-primary">關於教練</h2>
              <p className="text-body whitespace-pre-line text-text-secondary">{coach.intro}</p>

              <h2 className="text-h3 mt-1 text-text-primary">學歷與經歷</h2>
              <dl className="flex flex-col gap-3">
                {coach.education.map((entry, index) => (
                  <Fact key={index} label="學歷">
                    {entry.degree ? `${entry.degree}｜${entry.school}` : entry.school}
                  </Fact>
                ))}
                {coach.workExperience && <Fact label="工作／教學經歷">{coach.workExperience}</Fact>}
                {coach.competition && <Fact label="比賽經歷">{coach.competition}</Fact>}
              </dl>
            </div>
          </section>

          <Card title="已認證的專業證照">
            {coach.licenseNames.length === 0 ? (
              <p className="text-body-small text-text-secondary">尚無通過審核的證照</p>
            ) : (
              <>
                <ul className="flex flex-wrap gap-2">
                  {coach.licenseNames.map((name, index) => (
                    <li key={`${name}-${index}`}>
                      <Badge type="verified">{name}</Badge>
                    </li>
                  ))}
                </ul>
                <p className="text-caption text-text-secondary">只顯示通過審核的證照名稱。</p>
              </>
            )}
          </Card>

          {/* 手機版：招生中的課程排在評價前面（設計稿 S12 手機） */}
          <div className="lg:hidden">
            <CourseList courses={coach.courses} />
          </div>

          <Card title="評價與學員回饋">
            {hasRating ? (
              <div className="flex items-center gap-3">
                <span className="text-display text-text-primary">{(coach.avgRating ?? 0).toFixed(1)}</span>
                <div className="flex flex-col gap-1">
                  <StarRating rating={Math.round(coach.avgRating ?? 0)} size={16} />
                  <span className="text-body-small text-text-secondary">共 {coach.reviewCount} 則評價</span>
                </div>
              </div>
            ) : (
              <p className="text-body-small text-text-secondary">尚無評價</p>
            )}

            {coach.reviews.length > 0 && (
              <ul className="flex flex-col gap-3">
                {coach.reviews.map((review) => (
                  <li
                    key={review.id}
                    className="flex flex-col gap-2.5 rounded-md border border-border-default p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <span className="text-body truncate font-medium text-text-primary">
                          {review.reviewerName}
                        </span>
                        <time dateTime={review.createdAt} className="text-caption shrink-0 text-text-secondary">
                          {formatTaipeiDate(review.createdAt)}
                        </time>
                      </div>
                      <StarRating rating={review.rating} size={16} />
                    </div>
                    {review.comment && (
                      <p className="text-body whitespace-pre-line text-text-secondary">{review.comment}</p>
                    )}
                    {review.tags.length > 0 && (
                      <ul className="flex flex-wrap gap-1.5">
                        {review.tags.map((tag) => (
                          <li key={tag}>
                            <Badge type="info">{tag}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="hidden lg:block">
          <CourseList courses={coach.courses} />
        </aside>
      </div>
    </div>
  );
}

function CourseList({ courses }: { courses: CoachProfileData["courses"] }) {
  return (
    <Card title="招生中的課程">
      {courses.length === 0 ? (
        <p className="text-body-small text-text-secondary">目前沒有招生中的課程</p>
      ) : (
        <CoachCourseList courses={courses} />
      )}
    </Card>
  );
}
