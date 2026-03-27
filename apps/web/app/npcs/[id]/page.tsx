import { notFound } from "next/navigation";
import { getNpcDetail } from "@eq-alla/data";
import { DefinitionGrid, LinkList, PageHero, SectionCard } from "../../../components/catalog";

type NpcDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function NpcDetailPage({ params }: NpcDetailPageProps) {
  const { id } = await params;
  const npc = await getNpcDetail(Number(id));

  if (!npc) notFound();

  return (
    <>
      <PageHero
        eyebrow="NPC Detail"
        title={npc.name}
        description={`${npc.race} ${npc.klass} in ${npc.zone}`}
        badges={[npc.level, npc.named ? "Named" : "Common", npc.faction]}
      />
      <SectionCard title="Overview">
        <DefinitionGrid
          items={[
            { label: "Class", value: npc.klass },
            { label: "Health", value: npc.hp.toLocaleString() },
            { label: "Damage", value: npc.damage },
            { label: "Faction", value: npc.faction }
          ]}
        />
      </SectionCard>
      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Spells">
          <LinkList items={npc.spells.map((entry) => ({ href: entry.href, label: entry.name }))} />
        </SectionCard>
        <SectionCard title="Drops / sells">
          <LinkList
            items={[
              ...npc.drops.map((entry) => ({ href: entry.href, label: entry.name, meta: "Drop" })),
              ...npc.sells.map((entry) => ({ href: entry.href, label: entry.name, meta: "Merchant stock" }))
            ]}
          />
        </SectionCard>
        <SectionCard title="Spawn groups">
          <LinkList items={npc.spawnGroups.map((entry) => ({ href: entry.href, label: entry.name }))} />
        </SectionCard>
      </div>
    </>
  );
}
