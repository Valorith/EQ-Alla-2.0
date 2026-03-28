import { PageHero } from "../../../components/catalog-shell";
import { NpcSearchClient } from "../npc-search-client";

type AdvancedNpcsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdvancedNpcsPage({ searchParams }: AdvancedNpcsPageProps) {
  const params = await searchParams;
  const q = typeof params.name === "string" ? params.name : "";
  const race = typeof params.race === "string" ? params.race : "";
  const minLevel = typeof params.minLevel === "string" ? params.minLevel : "";
  const maxLevel = typeof params.maxLevel === "string" ? params.maxLevel : "";
  const named = params.named === "true" ? "true" : "";
  const showLevel = params.showLevel === "true" ? "true" : "";

  return (
    <>
      <PageHero
        eyebrow="Bestiary"
        title="Advanced NPC Search"
        description="This recreates the legacy high-detail NPC finder in a cleaner, faster interface."
      />
      <NpcSearchClient
        mode="advanced"
        initialFilters={{
          q,
          zone: "",
          race,
          minLevel,
          maxLevel,
          named,
          showLevel
        }}
      />
    </>
  );
}
