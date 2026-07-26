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
    <>
      <PageHero
        eyebrow="Bestiary"
        title="NPC Search"
        description="Search named mobs, guards, merchants, and creatures across the live bestiary."
      />
      <NpcSearchClient
        mode="basic"
        initialFilters={{
          q,
          zone,
          race: "",
          minLevel: "",
          maxLevel: "",
          named: "",
          showLevel: ""
        }}
      />
    </>
  );
}
