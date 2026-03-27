import Link from "next/link";
import { getZonesByLevel } from "@eq-alla/data";
import { PageHero, SectionCard, SimpleTable } from "../../../components/catalog";

export default async function ZonesByLevelPage() {
  const zones = await getZonesByLevel();

  return (
    <>
      <PageHero eyebrow="Zones" title="Zones by Level" description="A progression-oriented view for leveling and content planning." />
      <SectionCard title="Zone progression">
        <SimpleTable
          columns={["Zone", "Level range", "Era"]}
          rows={zones.map((zone) => [
            <Link key={zone.shortName} href={`/zones/${zone.shortName}`} className="font-medium hover:underline">
              {zone.longName}
            </Link>,
            zone.levelRange,
            zone.era
          ])}
        />
      </SectionCard>
    </>
  );
}
