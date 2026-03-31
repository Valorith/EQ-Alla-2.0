import Link from "next/link";
import { notFound } from "next/navigation";
import { getZonesByEra, resolveZoneEraLabel } from "@eq-alla/data";
import { PageHero, SectionCard, SimpleTable } from "../../../../components/catalog-shell";

export const dynamic = "force-dynamic";

type ZonesByEraDetailPageProps = {
  params: Promise<{ era: string }>;
};

function titleCase(input: string) {
  return input
    .split(/[-_ ]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function ZonesByEraDetailPage({ params }: ZonesByEraDetailPageProps) {
  const { era } = await params;
  const normalizedEra = resolveZoneEraLabel(era) || titleCase(era);
  const zones = await getZonesByEra(normalizedEra);

  if (zones.length === 0) notFound();

  return (
    <>
      <PageHero eyebrow="Zones" title={`${normalizedEra} Zones`} description="All zones indexed under this era label in the current catalog." />
      <SectionCard title={`${zones.length} zones`}>
        <SimpleTable
          columns={["Zone", "Level range", "Population"]}
          rows={zones.map((zone) => [
            <Link key={zone.shortName} href={`/zones/${zone.shortName}`} className="font-medium hover:underline">
              {zone.longName}
            </Link>,
            zone.levelRange,
            zone.population
          ])}
        />
      </SectionCard>
    </>
  );
}
