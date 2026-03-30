import { spellSearchLevelCap } from "@eq-alla/data";
import { PageHero } from "../../components/catalog-shell";
import { SpellSearchClient } from "./spell-search-client";

type SpellsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SpellsPage({ searchParams }: SpellsPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const className = typeof params.class === "string" ? params.class : "";
  const parsedLevel = typeof params.level === "string" ? Number(params.level) : Number.NaN;
  const level = Number.isInteger(parsedLevel) && parsedLevel >= 1 && parsedLevel <= spellSearchLevelCap ? String(parsedLevel) : "";
  const levelMode = params.levelMode === "min" || params.levelMode === "max" || params.levelMode === "exact" ? params.levelMode : "exact";

  return (
    <>
      <PageHero eyebrow="Spells" title="Spell Search" description="Browse spell data with class, level, and role-oriented filters." />
      <SpellSearchClient initialQuery={q} initialClassName={className} initialLevel={level} initialLevelMode={levelMode} levelCap={spellSearchLevelCap} />
    </>
  );
}
