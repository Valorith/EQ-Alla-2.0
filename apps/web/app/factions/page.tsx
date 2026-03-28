import { PageHero } from "../../components/catalog-shell";
import { FactionSearchClient } from "./faction-search-client";

type FactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FactionsPage({ searchParams }: FactionsPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";

  return (
    <>
      <PageHero eyebrow="Factions" title="Faction Search" description="Track faction groups, allied zones, and sample raise/lower relationships." />
      <FactionSearchClient initialQuery={q} />
    </>
  );
}
