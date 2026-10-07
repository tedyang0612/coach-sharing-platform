"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { courseListHref, HOME_SPORTS } from "@/app/_lib/home-config";
import { Icon } from "@/components/ui/icon";
import heroWave from "./hero-wave.svg";

// Figma「Hero」37:836：主視覺＋主標語＋快速找課（運動、地區、找課程）＋熱門條件。
// 兩個選單都沒選時直接前往課程列表（PRD 14.0 規格 2）。
export type HeroDistrict = { id: number; city: string; district: string };
export type HeroPopular = { label: string; href: string };

const FIELD =
  "text-body-large h-16 w-full appearance-none rounded-pill border border-border-default bg-brand-white pl-6 pr-12 text-text-primary outline-none focus:border-2 focus:border-brand-blue";

export function Hero({
  districts,
  popular,
}: {
  districts: HeroDistrict[];
  popular: HeroPopular[];
}) {
  const router = useRouter();
  const [sport, setSport] = useState("");
  const [districtId, setDistrictId] = useState("");

  // 地區下拉依縣市分組，維持內政部縣市代碼順序（districts 已依 id 排序）
  const cities = districts.reduce<{ city: string; items: HeroDistrict[] }[]>((acc, d) => {
    const last = acc[acc.length - 1];
    if (last && last.city === d.city) last.items.push(d);
    else acc.push({ city: d.city, items: [d] });
    return acc;
  }, []);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const picked = districts.find((d) => String(d.id) === districtId);
    router.push(courseListHref({ sport, city: picked?.city, district: picked?.district }));
  }

  return (
    <section className="relative flex min-h-[700px] flex-col justify-end overflow-clip md:min-h-[810px]">
      <Image
        src="/images/hero.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[60%_center]"
      />
      <div className="absolute inset-0 bg-linear-to-b from-brand-deep/0 from-20% to-brand-deep/36 to-65%" />

      <div className="relative flex flex-col gap-8 px-[var(--spacing-screen-padding)] pb-32 md:pb-40">
        <div className="flex flex-col gap-3 text-center text-text-inverse md:text-left">
          <h1 className="text-hero-responsive">
            用 <span className="font-[family-name:var(--font-latin)]">GoLand</span>，一定有夠練！
          </h1>
          <p className="text-hero-lead opacity-90">
            用運動、地點與時間找到適合你的小班課，集滿人就開課。
          </p>
        </div>

        <div className="flex flex-col items-center gap-3.5">
          <form
            onSubmit={search}
            className="flex w-full flex-col gap-3 rounded-lg bg-brand-white p-3 md:w-auto md:flex-row md:rounded-pill"
          >
            <div className="flex gap-3 md:contents">
              <div className="relative flex-1 md:w-[270px] md:flex-none">
                <select
                  aria-label="選擇運動"
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className={`${FIELD} ${sport ? "" : "text-text-secondary"}`}
                >
                  <option value="">選擇運動</option>
                  {HOME_SPORTS.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <Icon
                  name="chevron-down"
                  className="pointer-events-none absolute right-5 top-1/2 size-5 -translate-y-1/2"
                />
              </div>
              <div className="relative flex-1 md:w-[270px] md:flex-none">
                <select
                  aria-label="選擇地區"
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  className={`${FIELD} ${districtId ? "" : "text-text-secondary"}`}
                >
                  <option value="">選擇地區</option>
                  {cities.map((c) => (
                    <optgroup key={c.city} label={c.city}>
                      {c.items.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.district}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <Icon
                  name="chevron-down"
                  className="pointer-events-none absolute right-5 top-1/2 size-5 -translate-y-1/2"
                />
              </div>
            </div>
            <button
              type="submit"
              className="text-h3 h-16 rounded-pill bg-brand-blue text-text-inverse transition active:bg-brand-blue-pressed md:w-52"
            >
              找課程
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <span className="text-label text-text-inverse">熱門條件</span>
            {popular.map((p) => (
              <Link
                key={p.label}
                href={p.href}
                className="text-label whitespace-nowrap rounded-pill border border-border-default bg-brand-white px-4 py-2 text-text-primary transition active:bg-tint-blue-100"
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Image
        src={heroWave}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full md:h-[84px]"
      />
    </section>
  );
}
