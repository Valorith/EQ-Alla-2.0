import { notFound } from "next/navigation";
import { getFactionDetail } from "@eq-alla/data";
import { TrendingDown, TrendingUp } from "lucide-react";
import { PageHero, SectionCard } from "../../../components/catalog-shell";
import { SearchablePaginatedLinkList } from "../../../components/searchable-paginated-link-list";

type FactionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function FactionDetailPage({ params }: FactionDetailPageProps) {
  const { id } = await params;
  const faction = await getFactionDetail(Number(id));

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
        <SectionCard
          title={
            <span className="inline-flex items-center gap-2">
              <span>Raised by</span>
              <TrendingUp className="size-5 text-emerald-400" aria-hidden="true" />
            </span>
          }
        >
          <SearchablePaginatedLinkList
            items={faction.raisedBy.map((entry) => ({ href: entry.href, label: entry.name }))}
            emptyText="No NPCs were found that raise this faction."
            searchPlaceholder="Search NPCs that raise this faction..."
          />
        </SectionCard>
        <SectionCard
          title={
            <span className="inline-flex items-center gap-2">
              <span>Lowered by</span>
              <TrendingDown className="size-5 text-rose-400" aria-hidden="true" />
            </span>
          }
        >
          <SearchablePaginatedLinkList
            items={faction.loweredBy.map((entry) => ({ href: entry.href, label: entry.name }))}
            emptyText="No NPCs were found that lower this faction."
            searchPlaceholder="Search NPCs that lower this faction..."
          />
        </SectionCard>
      </div>
    </>
  );
}
