import Link from "next/link";
import { listZoneEraDefinitions } from "@eq-alla/data";
import { ArrowRight } from "lucide-react";
import { PageHero, SectionCard } from "../../../components/catalog-shell";

export default async function ZonesByEraPage() {
  const eras = listZoneEraDefinitions();

  return (
    <>
      <PageHero eyebrow="Zones" title="Zones by Era" description="Browse the legacy era buckets used by the Alla clone, rebuilt with darker in-theme navigation." />
      <SectionCard title="Browse eras">
        <div className="grid gap-3 lg:grid-cols-2">
          {eras.map((era) => (
            <Link
              key={era.slug}
              href={`/zones/by-era/${encodeURIComponent(era.slug)}`}
              className="group flex items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,26,35,0.92),rgba(10,13,18,0.96))] px-5 py-4 text-[#ece2d2] shadow-[0_14px_32px_rgba(0,0,0,0.2)] transition hover:border-[#d1a95f]/34 hover:bg-[linear-gradient(180deg,rgba(48,39,29,0.94),rgba(14,17,23,0.98))] hover:text-white"
            >
              <div className="min-w-0">
                <p className="text-[15px] font-semibold tracking-[-0.02em]">{era.label}</p>
                <p className="mt-1 text-[12px] leading-6 text-[#b9ab96] group-hover:text-[#d9c9af]">See zones in this legacy era bucket.</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-[#9c8a6d] transition group-hover:translate-x-0.5 group-hover:text-[#e2bd78]" />
            </Link>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
