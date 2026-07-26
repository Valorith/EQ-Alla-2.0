import { notFound } from "next/navigation";
import { getZonesByEra, resolveZoneEraLabel } from "@eq-alla/data";
import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { buildPageMetadata } from "../../../../components/page-metadata";
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

export async function generateMetadata({ params }: ZonesByEraDetailPageProps) {
  const { era } = await params;
  const normalizedEra = resolveZoneEraLabel(era) || titleCase(era);

  return buildPageMetadata({
    title: `${normalizedEra} Zones`,
    description: `Every EverQuest zone mapped to the ${normalizedEra} expansion, with level ranges and zone connections.`,
    path: `/zones/by-era/${era}`
  });
}

export default async function ZonesByEraDetailPage({ params }: ZonesByEraDetailPageProps) {
  const { era } = await params;
  const normalizedEra = resolveZoneEraLabel(era) || titleCase(era);
  const zones = await getZonesByEra(normalizedEra);

  if (zones.length === 0) notFound();

  return (
    <>
      <Breadcrumbs
        entries={[
          { label: "Zones", href: "/zones" },
          { label: "By Expansion", href: "/zones/by-era" },
          { label: normalizedEra }
        ]}
      />
      <PageHero eyebrow="Zones" title={`${normalizedEra} Zones`} description="All zones mapped to this expansion value in the current catalog." />
      <SectionCard title={`${zones.length} zones`}>
        <ZonesByEraTable zones={zones} />
      </SectionCard>
    </>
  );
}
