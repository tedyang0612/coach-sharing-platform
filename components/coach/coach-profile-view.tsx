import Link from "next/link";
import type { EducationEntry } from "@/lib/coach-application/education";
import { CoachTags } from "./coach-tags";
import { RatingSummary, StarRating } from "./star-rating";
import { VerifiedBadge } from "./verified-badge";

export type CoachProfileData = {
  name: string;
  photoUrl: string;
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
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    reviewerName: string;
    createdAt: string;
  }[];
  // 目前招生中的課程
  courses: {
    id: string;
    title: string;
    whenLabel: string;
    locationName: string;
    pricePerPerson: number;
  }[];
};

// 時間一律指定台灣時區顯示（CLAUDE.md 時間與時區慣例）
function formatTaipeiDate(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(iso));
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <h2 className="text-base font-bold text-neutral-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * 教練個人檔案的畫面（PRD 9.0）。只負責顯示，資料由頁面查好傳進來。
 * 這裡不會收到、也不會顯示教練的聯絡方式（PRD 4.0 AC 4）。
 */
export function CoachProfileView({ coach }: { coach: CoachProfileData }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:flex-row sm:items-center sm:p-6">
        {/* 教練上傳到 Storage 的公開照片；next/image 要另外在共用的 next.config.ts 設定網域，這裡先用 img */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coach.photoUrl}
          alt={`${coach.name} 的照片`}
          className="h-24 w-24 shrink-0 rounded-2xl bg-neutral-100 object-cover sm:h-28 sm:w-28"
        />
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-neutral-900">{coach.name}</h1>
            {coach.isVerified && <VerifiedBadge size="md" />}
          </div>
          <p className="text-sm text-neutral-600">{coach.sportCategories.join("・")}</p>
          <RatingSummary average={coach.avgRating} count={coach.reviewCount} />
          <CoachTags tags={coach.tags} />
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="flex flex-col gap-6 md:col-span-2">
          <Card title="簡述">
            <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">
              {coach.intro}
            </p>
          </Card>

          <Card title="學歷與經歷">
            <dl className="flex flex-col gap-4 text-sm">
              <div>
                <dt className="font-semibold text-neutral-800">學歷</dt>
                <dd className="mt-1">
                  <ul className="flex flex-col gap-1 text-neutral-700">
                    {coach.education.map((entry, index) => (
                      <li key={index}>
                        {entry.degree && (
                          <span className="mr-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                            {entry.degree}
                          </span>
                        )}
                        {entry.school}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
              {coach.workExperience && (
                <div>
                  <dt className="font-semibold text-neutral-800">工作／教學經歷</dt>
                  <dd className="mt-1 whitespace-pre-line leading-relaxed text-neutral-700">
                    {coach.workExperience}
                  </dd>
                </div>
              )}
              {coach.competition && (
                <div>
                  <dt className="font-semibold text-neutral-800">比賽經歷</dt>
                  <dd className="mt-1 whitespace-pre-line leading-relaxed text-neutral-700">
                    {coach.competition}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          <Card title="招生中的課程">
            {coach.courses.length === 0 ? (
              <p className="text-sm text-neutral-500">目前沒有招生中的課程</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {coach.courses.map((course) => (
                  <li key={course.id}>
                    <Link
                      href={`/courses/${course.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4 transition hover:border-brand"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-neutral-900">
                          {course.title}
                        </span>
                        <span className="mt-1 block text-xs text-neutral-500">
                          {course.whenLabel}・{course.locationName}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-brand">
                        NT$ {course.pricePerPerson.toLocaleString("zh-TW")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="評價與學員回饋">
            <RatingSummary average={coach.avgRating} count={coach.reviewCount} />
            {coach.reviews.length > 0 && (
              <ul className="mt-4 flex flex-col gap-4">
                {coach.reviews.map((review) => (
                  <li key={review.id} className="border-t border-neutral-100 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-neutral-800">
                        {review.reviewerName}
                      </span>
                      <time dateTime={review.createdAt} className="text-xs text-neutral-400">
                        {formatTaipeiDate(review.createdAt)}
                      </time>
                    </div>
                    <div className="mt-1">
                      <StarRating rating={review.rating} />
                    </div>
                    {review.comment && (
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                        {review.comment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside>
          <Card title="已認證的專業證照">
            {coach.licenseNames.length === 0 ? (
              <p className="text-sm text-neutral-500">尚無通過審核的證照</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {coach.licenseNames.map((name, index) => (
                  <li
                    key={`${name}-${index}`}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 p-3"
                  >
                    <p className="text-sm font-semibold text-neutral-900">{name}</p>
                    <p className="mt-0.5 text-xs text-brand">平台人工審核通過</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
