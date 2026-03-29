import { listZoneEras, resolveZoneEraLabel } from "@eq-alla/data";
import { PageHero } from "../../components/catalog-shell";
import { ZoneSearchClient } from "./zone-search-client";

type ZonesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ZonesPage({ searchParams }: ZonesPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const era = typeof params.era === "string" ? resolveZoneEraLabel(params.era) : "";
  const eraOptions = await listZoneEras();

  return (
    <>
      <PageHero eyebrow="Zones" title="Populated Zones" description="Browse zones by era, level, or direct detail pages with resource tabs." />
      <ZoneSearchClient initialQuery={q} initialEra={era} eraOptions={eraOptions} />
    </>
  );
}
