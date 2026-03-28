import { notFound } from "next/navigation";
import { getFactionDetail } from "@eq-alla/data";
import { LinkList, PageHero, SectionCard } from "../../../components/catalog-shell";

type FactionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function FactionDetailPage({ params }: FactionDetailPageProps) {
  const { id } = await params;
  const faction = getFactionDetail(Number(id));

  if (!faction) notFound();

  return (
    <>
      <PageHero
        eyebrow="Faction Detail"
        title={faction.name}
        description={faction.overview}
        badges={[faction.category, faction.alignedZone]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Raised by">
          <LinkList items={faction.raisedBy.map((entry) => ({ href: entry.href, label: entry.name }))} />
        </SectionCard>
        <SectionCard title="Lowered by">
          <LinkList items={faction.loweredBy.map((entry) => ({ href: entry.href, label: entry.name }))} />
        </SectionCard>
      </div>
    </>
  );
}
