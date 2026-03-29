import Link from "next/link";
import { getZonesByLevel } from "@eq-alla/data";
import { PageHero, SectionCard } from "../../../components/catalog-shell";

function bandTone(npcCount: number) {
  if (npcCount >= 20) {
    return "border-[#d5a55a]/40 bg-[#d5a55a]/18 text-[#f5d7a3]";
  }

  if (npcCount >= 10) {
    return "border-white/15 bg-white/8 text-[#eadcc5]";
  }

  if (npcCount >= 5) {
    return "border-white/10 bg-white/5 text-[#cdbda3]";
  }

  return "border-transparent bg-transparent text-[#857560]";
}

export default async function ZonesByLevelPage() {
  const zones = await getZonesByLevel();
  const bands = zones[0]?.bands ?? [];

  return (
    <>
      <PageHero
        eyebrow="Zones"
        title="Zones by Level"
        description="Approximate hunting bands based on the distinct creature types found in each zone. This view bins live NPC levels into 5-level ranges so mixed-service zones like East Commons read more cleanly than a raw min/max field."
      />

      <SectionCard
        title="Zone progression"
        right={
          <p className="max-w-xl text-sm leading-6 text-[#b8ab94]">
            Numbers show distinct NPC types in each 5-level band. Level 1 trigger NPCs and invisible men are excluded to keep the table closer to actual playable content.
          </p>
        }
      >
        <div className="overflow-x-auto rounded-[28px] border border-[#7b603b]/18 bg-[linear-gradient(180deg,rgba(10,14,20,0.86),rgba(13,16,22,0.8))] shadow-[0_24px_50px_rgba(0,0,0,0.28)]">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[linear-gradient(180deg,rgba(215,164,95,0.1),rgba(255,255,255,0.02))] text-[#d7c09a]">
              <tr>
                <th className="min-w-[220px] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em]">Zone</th>
                <th className="min-w-[110px] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.24em]">Suggested</th>
                <th className="min-w-[110px] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.24em]">Era</th>
                {bands.map((band) => (
                  <th
                    key={band.label}
                    className="min-w-[74px] px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em]"
                  >
                    {band.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr
                  key={zone.shortName}
                  className="border-t border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.008))] align-top transition hover:bg-[linear-gradient(180deg,rgba(215,164,95,0.075),rgba(255,255,255,0.02))]"
                >
                  <td className="px-4 py-3.5 text-[#efe6d5]">
                    <Link href={`/zones/${zone.shortName}`} className="font-semibold text-white hover:text-[#f2cf8e] hover:underline">
                      {zone.longName}
                    </Link>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8f8069]">{zone.shortName}</div>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="inline-flex rounded-full border border-[#d5a55a]/24 bg-[#d5a55a]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#f0d4a3]">
                      {zone.suggestedLevel}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-[#d8cab4]">{zone.era}</td>
                  {zone.bands.map((band) => (
                    <td key={`${zone.shortName}-${band.label}`} className="px-2 py-3 text-center">
                      {band.npcCount > 0 ? (
                        <span
                          className={`inline-flex min-w-[42px] items-center justify-center rounded-full border px-2 py-1 text-xs font-semibold ${bandTone(
                            band.npcCount
                          )}`}
                        >
                          {band.npcCount}
                        </span>
                      ) : (
                        <span className="inline-block h-2 w-2 rounded-full bg-white/5" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}
