import Link from "next/link";
import { listSpells } from "@eq-alla/data";
import { Input } from "@eq-alla/ui";
import { FilterForm, PageHero, SearchPrompt, SectionCard, SelectField, SimpleTable } from "../../components/catalog-shell";

type SpellsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SpellsPage({ searchParams }: SpellsPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const hasQuery = q.trim().length > 0;
  const className = typeof params.class === "string" ? params.class : "";
  const level = typeof params.level === "string" ? Number(params.level) : undefined;
  const spells = hasQuery ? await listSpells({ q, className, level }) : [];

  return (
    <>
      <PageHero eyebrow="Spells" title="Spell Search" description="Browse spell data with class, level, and role-oriented filters." />
      <SectionCard title="Filters">
        <FilterForm action="/spells">
          <label className="grid gap-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Name</span>
            <Input name="q" defaultValue={q} placeholder="Complete Heal..." />
          </label>
          <SelectField label="Class" name="class" defaultValue={className} options={["Cleric", "Druid", "Shaman", "Wizard"]} />
          <SelectField label="Level" name="level" defaultValue={String(level ?? "")} options={["9", "39", "54"]} />
        </FilterForm>
      </SectionCard>
      <SectionCard title={hasQuery ? `${spells.length} matching spells` : "Results"}>
        {hasQuery ? (
          <SimpleTable
            columns={["Name", "Classes", "Level", "Skill", "Effect"]}
            rows={spells.map((spell) => [
              <Link key={spell.id} href={`/spells/${spell.id}`} className="font-medium hover:underline">
                {spell.name}
              </Link>,
              spell.classes.join(", "),
              spell.level,
              spell.skill,
              spell.effect
            ])}
          />
        ) : (
          <SearchPrompt message="Enter a spell name to load results." />
        )}
      </SectionCard>
    </>
  );
}
