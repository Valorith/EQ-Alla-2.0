import Link from "next/link";
import { listFactions } from "@eq-alla/data";
import { Input } from "@eq-alla/ui";
import { PageHero, SearchPrompt, SectionCard, SimpleTable } from "../../components/catalog-shell";

type FactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FactionsPage({ searchParams }: FactionsPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const hasQuery = q.trim().length > 0;
  const factions = hasQuery ? listFactions(q) : [];

  return (
    <>
      <PageHero eyebrow="Factions" title="Faction Search" description="Track faction groups, allied zones, and sample raise/lower relationships." />
      <SectionCard title="Filter">
        <form action="/factions" className="flex gap-3">
          <Input name="q" defaultValue={q} placeholder="Mayong..." />
          <button className="h-11 rounded-full bg-[var(--accent)] px-5 text-sm font-medium text-[var(--accent-foreground)]">
            Search
          </button>
        </form>
      </SectionCard>
      <SectionCard title={hasQuery ? `${factions.length} factions` : "Results"}>
        {hasQuery ? (
          <SimpleTable
            columns={["Name", "Category", "Aligned zone"]}
            rows={factions.map((faction) => [
              <Link key={faction.id} href={`/factions/${faction.id}`} className="font-medium hover:underline">
                {faction.name}
              </Link>,
              faction.category,
              faction.alignedZone
            ])}
          />
        ) : (
          <SearchPrompt message="Enter a faction name to load results." />
        )}
      </SectionCard>
    </>
  );
}
