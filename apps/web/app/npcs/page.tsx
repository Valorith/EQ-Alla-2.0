import { PageHero } from "../../components/catalog-shell";
import { NpcSearchClient } from "./npc-search-client";

type NpcsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
