import { listDistricts } from "@/app/courses/_lib/queries";
import { courseListHref, HOME_SPORTS, POPULAR_CONDITIONS } from "@/app/_lib/home-config";
import { getRecommendedClasses, getRecommendedCoaches } from "@/app/_lib/home-queries";
import { CoachCard } from "@/components/coach/coach-card";
import { ClassCard } from "@/components/course/class-card";
import { Hero } from "@/components/home/hero";
import { SectionHeader } from "@/components/home/section-header";
import { SportCategoryCard } from "@/components/home/sport-category-card";
import { Footer } from "@/components/layout/footer";
import { createClient } from "@/lib/supabase/server";

// S01｜P01 首頁（PRD 14.0）。未登入可瀏覽全部區塊；沒有符合的推薦課程／教練時整個區塊不顯示。
export default async function Home() {
  const supabase = await createClient();
  const [districts, classes, coaches] = await Promise.all([
    listDistricts(supabase),
    getRecommendedClasses(),
    getRecommendedCoaches(),
  ]);

  const popular = POPULAR_CONDITIONS.map(({ label, filter }) => ({ label, href: courseListHref(filter) }));

  const section = "px-[var(--spacing-screen-padding)] pt-8 md:pt-16";

  return (
    <main className="flex-1">
      <Hero districts={districts} popular={popular} />

      <section className={section}>
        <SectionHeader title="運動種類" subtitle="點選運動，直接查看相關課程" />
        <div className="-mx-[var(--spacing-screen-padding)] mt-5 flex gap-3 overflow-x-auto px-[var(--spacing-screen-padding)] pb-1 md:mx-0 md:mt-5 md:grid md:grid-cols-8 md:gap-3 md:overflow-visible md:px-0 md:pb-0">
          {HOME_SPORTS.map((sport) => (
            <SportCategoryCard
              key={sport.name}
              sport={sport}
              href={courseListHref({ sport: sport.name })}
              className="w-[140px] shrink-0 md:w-auto"
            />
          ))}
        </div>
      </section>

      {classes.length > 0 && (
        <section className={section}>
          <SectionHeader
            title="推薦課程"
            subtitle="優先顯示最有機會開課的場次"
            moreHref={courseListHref()}
            moreLabel="查看更多課程"
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* 手機版 Figma 只放 3 張（桌機 4 張，PRD 14.0） */}
            {classes.map((card, i) => (
              <ClassCard key={`${card.href}-${i}`} card={card} className={i >= 3 ? "max-md:hidden" : ""} />
            ))}
          </div>
        </section>
      )}

      {coaches.length > 0 && (
        <section className={section}>
          <SectionHeader
            title="推薦教練"
            subtitle="認證教練、真實評價，找到適合你的人"
            moreHref="/coaches"
            moreLabel="查看更多教練"
          />
          <div className="-mx-[var(--spacing-screen-padding)] mt-5 flex gap-3 overflow-x-auto px-[var(--spacing-screen-padding)] pb-1 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
            {coaches.map((coach) => (
              <CoachCard key={coach.href} coach={coach} className="w-[280px] shrink-0 md:w-auto" />
            ))}
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
