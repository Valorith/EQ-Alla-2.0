import { notFound } from "next/navigation";
import { getZonesByEra, resolveZoneEraLabel } from "@eq-alla/data";
import { PageHero, SectionCard } from "../../../../components/catalog-shell";
import { ZonesByEraTable } from "./zones-by-era-table";

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
      <PageHero eyebrow="Zones" title={`${normalizedEra} Zones`} description="All zones mapped to this expansion value in the current catalog." />
      <SectionCard title={`${zones.length} zones`}>
        <ZonesByEraTable zones={zones} />
      </SectionCard>
    </>
  );
}
