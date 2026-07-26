import { notFound } from "next/navigation";
import { cache } from "react";
import { getSpawnGroupDetail } from "@eq-alla/data";
import { Breadcrumbs } from "../../../components/breadcrumbs";
import { buildNotFoundMetadata, buildPageMetadata } from "../../../components/page-metadata";
import { DefinitionGrid, LinkList, PageHero, SectionCard } from "../../../components/catalog-shell";

type SpawnGroupPageProps = {
  params: Promise<{ id: string }>;
};

const loadSpawnGroupDetail = cache(getSpawnGroupDetail);

export async function generateMetadata({ params }: SpawnGroupPageProps) {
  const { id } = await params;
  const group = await loadSpawnGroupDetail(Number(id));

  if (!group) {
    return buildNotFoundMetadata("Spawn group");
  }

  return buildPageMetadata({
    title: group.name,
    description: `Spawn set in ${group.zone.longName} with a ${group.respawn} respawn, listing every NPC in the rotation and its chance.`,
    path: `/spawngroups/${id}`
  });
}

export default async function SpawnGroupPage({ params }: SpawnGroupPageProps) {
  const { id } = await params;
  const group = await loadSpawnGroupDetail(Number(id));

  if (!group) notFound();

  return (
    <>
      <Breadcrumbs
        entries={[
          { label: "Zones", href: "/zones" },
          { label: group.zone.longName, href: group.zone.href },
          { label: group.name }
        ]}
      />
      <PageHero eyebrow="Spawn Group" title={group.name} description={`Spawn set in ${group.zone.longName}`} badges={[group.respawn]} />
      <SectionCard title="Overview">
        <DefinitionGrid
          items={[
            { label: "Zone", value: group.zone.longName },
            { label: "Respawn", value: group.respawn },
            { label: "Locations", value: group.locations.join(" • ") }
          ]}
        />
      </SectionCard>
      <SectionCard title="Entries">
        <LinkList items={group.entries.map((entry) => ({ href: entry.href, label: `${entry.name} (${entry.chance})` }))} />
      </SectionCard>
    </>
  );
}
