import Link from "next/link";
import { listZones } from "@eq-alla/data";
import { Input } from "@eq-alla/ui";
import { FilterForm, PageHero, SearchPrompt, SectionCard, SelectField, SimpleTable } from "../../components/catalog-shell";

type ZonesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ZonesPage({ searchParams }: ZonesPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const hasQuery = q.trim().length > 0;
  const era = typeof params.era === "string" ? params.era : "";
  const zones = hasQuery ? await listZones({ q, era }) : [];

  return (
    <>
      <PageHero eyebrow="Zones" title="Populated Zones" description="Browse zones by era, level, or direct detail pages with resource tabs." />
      <SectionCard title="Filters">
        <FilterForm action="/zones">
          <label className="grid gap-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Zone</span>
            <Input name="q" defaultValue={q} placeholder="Mistmoore..." />
          </label>
          <SelectField label="Era" name="era" defaultValue={era} options={["Classic", "Planes of Power"]} />
        </FilterForm>
      </SectionCard>
      <SectionCard
        title={hasQuery ? `${zones.length} zones` : "Results"}
        right={
          <Link href="/zones/by-level" className="text-sm text-white/70 hover:text-white hover:underline">
            By level
          </Link>
        }
      >
        {hasQuery ? (
          <SimpleTable
            columns={["Zone", "Era", "Level range", "Population"]}
            rows={zones.map((zone) => [
              <Link key={zone.shortName} href={`/zones/${zone.shortName}`} className="font-medium hover:underline">
                {zone.longName}
              </Link>,
              zone.era,
              zone.levelRange,
              zone.population
            ])}
          />
        ) : (
          <SearchPrompt message="Enter a zone name to load results." />
        )}
      </SectionCard>
    </>
  );
}
