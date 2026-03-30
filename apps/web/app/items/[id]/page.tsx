import Link from "next/link";
import { notFound } from "next/navigation";
import { getItemDetail } from "@eq-alla/data";
import { ItemDetailPreview } from "../../../components/item-detail-preview";
import { PaginatedRelatedSection } from "../../../components/paginated-related-section";

type ItemDetailPageProps = {
  params: Promise<{ id: string }>;
};

function RelatedSection({
  title,
  items,
  emptyText
}: {
  title: string;
  items: Array<{ href: string; label: string }>;
  emptyText: string;
}) {
  return (
    <section className="space-y-3">
      <div className="rounded-[10px] border border-white/10 bg-[linear-gradient(180deg,rgba(47,54,66,0.96),rgba(35,41,52,0.92))] px-3 py-2 text-[16px] font-semibold text-[#ddd2b5] shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
        {title}
      </div>
      {items.length > 0 ? (
        <div className="rounded-[10px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,23,31,0.94),rgba(11,15,22,0.92))] px-4 py-3 shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
          <ul className="list-disc space-y-2 pl-7 text-[15px] text-[#dfe4ee] marker:text-[#c5a869]">
            {items.map((entry) => (
              <li key={`${title}-${entry.href}`}>
                <Link
                  href={entry.href}
                  className="font-medium text-[#7ab8ff] underline decoration-[1.5px] underline-offset-2 transition hover:text-[#a7d2ff] hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ab8ff]/35"
                >
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-[10px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,23,31,0.94),rgba(11,15,22,0.92))] px-4 py-3 shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
          <p className="text-[15px] text-[#aeb8ca]">{emptyText}</p>
        </div>
      )}
    </section>
  );
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id } = await params;
  const item = await getItemDetail(Number(id));

  if (!item) notFound();

  return (
    <div className="max-w-[1240px] space-y-8 text-[#e6e0d2]">
      <div className="space-y-3">
        <ItemDetailPreview item={item} className="max-w-[650px]" />
      </div>

      <div className="max-w-[1080px] space-y-6">
        <RelatedSection
          title="Dropped in Zones"
          items={item.droppedInZones.map((entry) => ({ href: entry.href, label: entry.longName }))}
          emptyText="No zone drop data recorded."
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <PaginatedRelatedSection
            title="Dropped by NPCs"
            items={item.droppedBy.map((entry) => ({ href: entry.href, label: entry.name }))}
            emptyText="No NPC drop data recorded."
          />
          <PaginatedRelatedSection
            title="Sold by merchants"
            items={item.soldBy.map((entry) => ({ href: entry.href, label: entry.name }))}
            emptyText="This item is not sold by merchants."
          />
          <PaginatedRelatedSection
            title="Used in recipes"
            items={item.usedInRecipes.map((entry) => ({ href: entry.href, label: entry.name }))}
            emptyText="This item is not used in recorded recipes."
          />
        </div>
      </div>
    </div>
  );
}
