import { notFound } from "next/navigation";
import { getItemDetail } from "@eq-alla/data";
import { DefinitionGrid, LinkList, PageHero, SectionCard } from "../../../components/catalog";

type ItemDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id } = await params;
  const item = await getItemDetail(Number(id));

  if (!item) notFound();

  return (
    <>
      <PageHero
        eyebrow="Item Detail"
        title={item.name}
        description={item.lore}
        badges={[item.type, item.slot, `Required level ${item.levelRequired}`]}
      />
      <SectionCard title="Stats">
        <DefinitionGrid items={item.stats.map((stat) => ({ label: stat.label, value: stat.value }))} />
      </SectionCard>
      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Dropped by">
          <LinkList items={item.droppedBy.map((entry) => ({ href: entry.href, label: entry.name }))} />
        </SectionCard>
        <SectionCard title="Sold by">
          <LinkList items={item.soldBy.map((entry) => ({ href: entry.href, label: entry.name }))} />
        </SectionCard>
        <SectionCard title="Used in recipes">
          <LinkList items={item.usedInRecipes.map((entry) => ({ href: entry.href, label: entry.name }))} />
        </SectionCard>
      </div>
    </>
  );
}
