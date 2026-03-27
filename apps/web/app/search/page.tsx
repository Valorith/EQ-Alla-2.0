import Link from "next/link";
import { searchCatalog } from "@eq-alla/data";
import { Input } from "@eq-alla/ui";
import { PageHero, SectionCard, SimpleTable } from "../../components/catalog";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const hits = query ? await searchCatalog(query) : [];

  return (
    <>
      <PageHero
        eyebrow="Global Search"
        title={query ? `Results for "${query}"` : "Search the archive"}
        description="Cross-entity search spans items, spells, NPCs, zones, and the rest of the Alla catalog."
      />

      <SectionCard title="Query">
        <form action="/search" className="flex flex-col gap-3 sm:flex-row">
          <Input name="q" type="search" defaultValue={query} placeholder="Search for zones, NPCs, items..." />
          <button className="h-11 rounded-full bg-[var(--accent)] px-5 text-sm font-medium text-[var(--accent-foreground)]">
            Search
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Matches">
        <SimpleTable
          columns={["Name", "Type", "Summary", "Tags"]}
          rows={hits.map((hit) => [
            <Link key={hit.href} href={hit.href} className="font-medium hover:underline">
              {hit.title}
            </Link>,
            hit.type,
            hit.subtitle,
            hit.tags.join(" • ")
          ])}
        />
      </SectionCard>
    </>
  );
}

