import { PageHero } from "../../components/catalog-shell";
import { FactionSearchClient } from "./faction-search-client";

type FactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FactionsPage({ searchParams }: FactionsPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const zone = typeof params.zone === "string" ? params.zone : "";
  const relationship = typeof params.relationship === "string" ? params.relationship : "";
  const view = typeof params.view === "string" ? params.view : "";

  return (
    <>
      <PageHero eyebrow="Factions" title="Faction Search" description="Track faction groups, aligned zones, and NPCs that can raise or lower standing. Search narrowly or browse the full index." />
      <FactionSearchClient initialQuery={q} initialZone={zone} initialRelationship={relationship} initialViewAll={view === "all"} />
    </>
  );
}
