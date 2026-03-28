import Link from "next/link";
import { listNpcs } from "@eq-alla/data";
import { Input } from "@eq-alla/ui";
import { FilterForm, PageHero, SearchPrompt, SectionCard, SelectField, SimpleTable } from "../../components/catalog-shell";

type NpcsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NpcsPage({ searchParams }: NpcsPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const hasQuery = q.trim().length > 0;
  const zone = typeof params.zone === "string" ? params.zone : "";
  const npcs = hasQuery ? await listNpcs({ q, zone }) : [];

  return (
    <>
      <PageHero
        eyebrow="Bestiary"
        title="NPC Search"
        description="Use the quick list for the common browse flow or switch to the advanced screen for legacy-style filters."
      />
      <SectionCard
        title="Filters"
        right={
          <Link href="/npcs/advanced" className="text-sm text-white/70 hover:text-white hover:underline">
            Advanced search
          </Link>
        }
      >
        <FilterForm action="/npcs">
          <label className="grid gap-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Name</span>
            <Input name="q" defaultValue={q} placeholder="mistmoore guard..." />
          </label>
          <SelectField label="Zone" name="zone" defaultValue={zone} options={["Castle Mistmoore", "The Plane of Knowledge"]} />
        </FilterForm>
      </SectionCard>
      <SectionCard title={hasQuery ? `${npcs.length} matching NPCs` : "Results"}>
        {hasQuery ? (
          <SimpleTable
            columns={["Name", "Race", "Level", "Zone", "Named"]}
            rows={npcs.map((npc) => [
              <Link key={npc.id} href={`/npcs/${npc.id}`} className="font-medium hover:underline">
                {npc.name}
              </Link>,
              npc.race,
              npc.level,
              npc.zone,
              npc.named ? "Yes" : "No"
            ])}
          />
        ) : (
          <SearchPrompt message="Enter an NPC name to load results." />
        )}
      </SectionCard>
    </>
  );
}
