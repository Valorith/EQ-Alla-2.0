import Link from "next/link";
import { listNpcs } from "@eq-alla/data";
import { Input } from "@eq-alla/ui";
import { FilterForm, PageHero, SearchPrompt, SectionCard, SelectField, SimpleTable } from "../../../components/catalog-shell";

type AdvancedNpcsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdvancedNpcsPage({ searchParams }: AdvancedNpcsPageProps) {
  const params = await searchParams;
  const q = typeof params.name === "string" ? params.name : "";
  const hasQuery = q.trim().length > 0;
  const race = typeof params.race === "string" ? params.race : "";
  const minLevel = typeof params.minLevel === "string" ? Number(params.minLevel) : undefined;
  const maxLevel = typeof params.maxLevel === "string" ? Number(params.maxLevel) : undefined;
  const named = params.named === "true" ? true : undefined;
  const npcs = hasQuery ? await listNpcs({ q, race, minLevel, maxLevel, named }) : [];

  return (
    <>
      <PageHero
        eyebrow="Bestiary"
        title="Advanced NPC Search"
        description="This recreates the legacy high-detail NPC finder in a cleaner, faster interface."
      />
      <SectionCard title="Advanced filters">
        <FilterForm action="/npcs/advanced">
          <label className="grid gap-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Name</span>
            <Input name="name" defaultValue={q} placeholder="V'Lyra..." />
          </label>
          <SelectField label="Race" name="race" defaultValue={race} options={["Dark Elf", "Human"]} />
          <SelectField label="Min level" name="minLevel" defaultValue={String(minLevel ?? "")} options={["30", "50", "60"]} />
          <SelectField label="Max level" name="maxLevel" defaultValue={String(maxLevel ?? "")} options={["38", "52", "60"]} />
          <SelectField label="Named only" name="named" defaultValue={String(named ?? "")} options={["true"]} />
        </FilterForm>
      </SectionCard>
      <SectionCard title={hasQuery ? `${npcs.length} matches` : "Results"}>
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
              npc.named ? "Named" : "Common"
            ])}
          />
        ) : (
          <SearchPrompt message="Enter an NPC name to load results." />
        )}
      </SectionCard>
    </>
  );
}
