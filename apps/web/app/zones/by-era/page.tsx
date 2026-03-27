import { listZoneEras } from "@eq-alla/data";
import { LinkList, PageHero, SectionCard } from "../../../components/catalog";

export default async function ZonesByEraPage() {
  const eras = await listZoneEras();

  return (
    <>
      <PageHero eyebrow="Zones" title="Zones by Era" description="The legacy zonelist flow rebuilt around clean routes." />
      <SectionCard title="Browse eras">
        <LinkList
          items={eras.map((era) => ({
            href: `/zones/by-era/${encodeURIComponent(era.toLowerCase())}`,
            label: era,
            meta: "See zones in this expansion era"
          }))}
        />
      </SectionCard>
    </>
  );
}
