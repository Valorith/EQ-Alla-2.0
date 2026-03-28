import { PageHero } from "../../components/catalog-shell";
import { SearchClient } from "./search-client";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";

  return (
    <>
      <PageHero
        eyebrow="Global Search"
        title={query ? `Results for "${query}"` : "Search the archive"}
        description="Cross-entity search spans items, spells, NPCs, zones, and the rest of the Alla catalog."
      />
      <SearchClient initialQuery={query} />
    </>
  );
}
