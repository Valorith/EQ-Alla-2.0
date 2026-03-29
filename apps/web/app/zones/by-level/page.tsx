import { getZonesByLevel } from "@eq-alla/data";
import { PageHero, SectionCard } from "../../../components/catalog-shell";
import { ZonesByLevelMatrix } from "./zones-by-level-matrix";

export const dynamic = "force-dynamic";

export default async function ZonesByLevelPage() {
  const zones = await getZonesByLevel();

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
        <ZonesByLevelMatrix zones={zones} />
      </SectionCard>
    </>
  );
}
