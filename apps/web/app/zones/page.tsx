import { listZoneEras, resolveZoneEraLabel } from "@eq-alla/data";
import { PageHero } from "../../components/catalog-shell";
import { ZoneSearchClient } from "./zone-search-client";

const zoneSearchEraOptions = [
  "Antonica",
  "Odus",
  "Faydwer",
  "Old World Planes",
  "Ruins of Kunark",
  "Scars of Velious"
] as const;

type ZonesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ZonesPage({ searchParams }: ZonesPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const resolvedEra = typeof params.era === "string" ? resolveZoneEraLabel(params.era) : "";
  const availableEraOptions = new Set(await listZoneEras());
  const eraOptions = zoneSearchEraOptions.filter((era) => availableEraOptions.has(era));
  const era = eraOptions.includes(resolvedEra as (typeof zoneSearchEraOptions)[number]) ? resolvedEra : "";

  return (
    <>
      <PageHero eyebrow="Zones" title="Populated Zones" description="Browse zones by era, level, or direct detail pages with resource tabs." />
      <ZoneSearchClient initialQuery={q} initialEra={era} eraOptions={eraOptions} />
    </>
  );
}
