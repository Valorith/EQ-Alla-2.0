import { listZoneEraDefinitions } from "@eq-alla/data";
import { LinkList, PageHero, SectionCard } from "../../../components/catalog-shell";

export default async function ZonesByEraPage() {
  const eras = listZoneEraDefinitions();

  return (
    <>
      <PageHero eyebrow="Zones" title="Zones by Era" description="The legacy zonelist flow rebuilt around clean routes." />
      <SectionCard title="Browse eras">
        <LinkList
          items={eras.map((era) => ({
            href: `/zones/by-era/${encodeURIComponent(era.slug)}`,
            label: era.label,
            meta: "See zones in this legacy era bucket"
          }))}
        />
      </SectionCard>
    </>
  );
}
