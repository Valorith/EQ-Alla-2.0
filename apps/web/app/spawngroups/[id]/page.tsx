import { notFound } from "next/navigation";
import { getSpawnGroupDetail } from "@eq-alla/data";
import { DefinitionGrid, LinkList, PageHero, SectionCard } from "../../../components/catalog";

type SpawnGroupPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SpawnGroupPage({ params }: SpawnGroupPageProps) {
  const { id } = await params;
  const group = getSpawnGroupDetail(Number(id));

  if (!group) notFound();

  return (
    <>
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

