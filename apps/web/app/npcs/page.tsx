import { PageHero } from "../../components/catalog-shell";
import { NpcSearchClient } from "./npc-search-client";
import { buildPageMetadata } from "../../components/page-metadata";

type NpcsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = buildPageMetadata({
  title: "NPC Search",
  description:
    "Search named mobs, guards, merchants, and creatures across the live bestiary, with stats, loot tables, faction, and spawn zones.",
  path: "/npcs"
});

export default async function NpcsPage({ searchParams }: NpcsPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const zone = typeof params.zone === "string" ? params.zone : "";

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Bestiary"
        title="NPC Search"
        description="Search the live bestiary by encounter, habitat, creature profile, combat range, and role."
      />
      <NpcSearchClient
        mode="basic"
        initialFilters={{
          q,
          zone,
          race: typeof params.race === "string" ? params.race : "",
          className: typeof params.class === "string" ? params.class : "",
          bodyType: typeof params.bodyType === "string" ? params.bodyType : "",
          minLevel: typeof params.minLevel === "string" ? params.minLevel : "",
          maxLevel: typeof params.maxLevel === "string" ? params.maxLevel : "",
          minHp: typeof params.minHp === "string" ? params.minHp : "",
          maxHp: typeof params.maxHp === "string" ? params.maxHp : "",
          named: typeof params.named === "string" ? params.named : "",
          merchant: typeof params.merchant === "string" ? params.merchant : ""
        }}
      />
    </div>
  );
}
