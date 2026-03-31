import Link from "next/link";
import { listZoneEraBrowseDefinitions } from "@eq-alla/data";
import { ArrowRight } from "lucide-react";
import { PageHero, SectionCard } from "../../../components/catalog-shell";

export default async function ZonesByEraPage() {
  const eras = await listZoneEraBrowseDefinitions();

  return (
    <>
      <PageHero eyebrow="Zones" title="Zones by Era" description="Browse the legacy era buckets used by the Alla clone, rebuilt with darker in-theme navigation." />
      <SectionCard title="Browse eras">
        <div className="grid gap-3 lg:grid-cols-2">
          {eras.map((era) =>
            era.enabled ? (
              <Link
                key={era.slug}
                href={`/zones/by-era/${encodeURIComponent(era.slug)}`}
                className="group flex items-center justify-between gap-4 rounded-[22px] border border-[#d1a95f]/18 bg-[linear-gradient(180deg,rgba(27,32,42,0.96),rgba(12,15,21,0.98))] px-5 py-4 text-[#f2e7d5] shadow-[0_14px_32px_rgba(0,0,0,0.26)] transition hover:border-[#d1a95f]/42 hover:bg-[linear-gradient(180deg,rgba(54,43,31,0.96),rgba(16,19,25,0.99))] hover:text-white"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold tracking-[-0.02em] text-[#fff4dc] drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)] group-hover:text-white">
                    {era.label}
                  </p>
                  <p className="mt-1 text-[12px] leading-6 text-[#dfd0ba] group-hover:text-[#f0dfc4]">
                    {era.zoneCount} public zone{era.zoneCount === 1 ? "" : "s"} in this legacy era bucket.
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-[#c8af87] transition group-hover:translate-x-0.5 group-hover:text-[#f0ca83]" />
              </Link>
            ) : (
              <div
                key={era.slug}
                aria-disabled="true"
                className="flex items-center justify-between gap-4 rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(23,26,33,0.8),rgba(11,13,18,0.88))] px-5 py-4 text-[#a79a88] opacity-65"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold tracking-[-0.02em] text-[#d0c2ae]">{era.label}</p>
                  <p className="mt-1 text-[12px] leading-6 text-[#9a8b78]">No public zones with status 1 are available in this era.</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-[#7f7466]" />
              </div>
            )
          )}
        </div>
      </SectionCard>
    </>
  );
}
