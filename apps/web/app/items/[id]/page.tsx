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

function GroupedNpcSection({
  title,
  entries,
  emptyText
}: {
  title: string;
  entries: Array<{
    href: string;
    label: string;
    zone: { href: string; label: string };
  }>;
  emptyText: string;
}) {
  const groups = entries.reduce<Array<{ zone: { href: string; label: string }; items: Array<{ href: string; label: string }> }>>(
    (accumulator, entry) => {
      const currentGroup = accumulator.find((group) => group.zone.href === entry.zone.href);
      if (currentGroup) {
        currentGroup.items.push({ href: entry.href, label: entry.label });
        return accumulator;
      }

      accumulator.push({
        zone: entry.zone,
        items: [{ href: entry.href, label: entry.label }]
      });
      return accumulator;
    },
    []
  );

  return (
    <section className="space-y-3">
      <div className="rounded-[10px] border border-white/10 bg-[linear-gradient(180deg,rgba(47,54,66,0.96),rgba(35,41,52,0.92))] px-3 py-2 text-[16px] font-semibold text-[#ddd2b5] shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
        {title}
      </div>
      {groups.length > 0 ? (
        <div className="rounded-[10px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,23,31,0.94),rgba(11,15,22,0.92))] px-4 py-4 shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.zone.href} className="space-y-2 border-b border-white/8 pb-4 last:border-b-0 last:pb-0">
                <Link
                  href={group.zone.href}
                  className="inline-flex font-semibold text-[#d9c391] underline decoration-[1.5px] underline-offset-2 transition hover:text-[#ecd6a3] hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9c391]/35"
                >
                  {group.zone.label}
                </Link>
                <ul className="columns-1 list-disc space-y-1 pl-7 text-[15px] text-[#dfe4ee] marker:text-[#c5a869] sm:columns-2 xl:columns-3">
                  {group.items.map((entry) => (
                    <li key={`${group.zone.href}-${entry.href}`} className="break-inside-avoid">
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
            ))}
          </div>
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
      <div className="inline-block max-w-full space-y-3 align-top">
        <ItemDetailPreview item={item} className="max-w-[650px]" />
      </div>

      <div className="max-w-[1080px] space-y-6">
        <RelatedSection
          title="Dropped in Zones"
          items={item.droppedInZones.map((entry) => ({ href: entry.href, label: entry.longName }))}
          emptyText="No zone drop data recorded."
        />

        <GroupedNpcSection
          title="Dropped by NPCs"
          entries={item.droppedBy.map((entry) => ({
            href: entry.href,
            label: entry.name,
            zone: { href: entry.zone.href, label: entry.zone.longName }
          }))}
          emptyText="No NPC drop data recorded."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <GroupedNpcSection
            title="Sold by merchants"
            entries={item.soldBy.map((entry) => ({
              href: entry.href,
              label: entry.name,
              zone: { href: entry.zone.href, label: entry.zone.longName }
            }))}
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
