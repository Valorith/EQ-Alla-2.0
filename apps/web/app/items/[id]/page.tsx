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
  emptyText,
  fallbackLabel
}: {
  title: string;
  items: Array<{ href?: string; label: string; suffix?: string }>;
  emptyText: string;
  fallbackLabel?: string;
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
              <li key={`${title}-${entry.href ?? entry.label}`}>
                {entry.href ? (
                  <Link
                    href={entry.href}
                    className="font-medium text-[#7ab8ff] underline decoration-[1.5px] underline-offset-2 transition hover:text-[#a7d2ff] hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ab8ff]/35"
                  >
                    {entry.label}
                  </Link>
                ) : (
                  <span className="font-medium text-[#dfe4ee]">{entry.label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : fallbackLabel ? (
        <div className="rounded-[10px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,23,31,0.94),rgba(11,15,22,0.92))] px-4 py-3 shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
          <ul className="list-disc space-y-2 pl-7 text-[15px] text-[#dfe4ee] marker:text-[#c5a869]">
            <li>
              <span className="font-medium text-[#dfe4ee]">{fallbackLabel}</span>
            </li>
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
  emptyText,
  fallbackLabel
}: {
  title: string;
  entries: Array<{
    href: string;
    label: string;
    suffix?: string;
    zone: { href: string; label: string };
  }>;
  emptyText: string;
  fallbackLabel?: string;
}) {
  const groups = entries.reduce<Array<{ zone: { href: string; label: string }; items: Array<{ href: string; label: string; suffix?: string }> }>>(
    (accumulator, entry) => {
      const currentGroup = accumulator.find((group) => group.zone.href === entry.zone.href);
      if (currentGroup) {
        currentGroup.items.push({ href: entry.href, label: entry.label, suffix: entry.suffix });
        return accumulator;
      }

      accumulator.push({
        zone: entry.zone,
        items: [{ href: entry.href, label: entry.label, suffix: entry.suffix }]
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
                      {entry.suffix ? <span className="text-[#d8ccb7]"> {entry.suffix}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : fallbackLabel ? (
        <div className="rounded-[10px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,23,31,0.94),rgba(11,15,22,0.92))] px-4 py-3 shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
          <ul className="list-disc space-y-2 pl-7 text-[15px] text-[#dfe4ee] marker:text-[#c5a869]">
            <li>
              <span className="font-medium text-[#dfe4ee]">{fallbackLabel}</span>
            </li>
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

function formatDropChance(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0%";
  }

  return (Math.round(value * 1000) / 1000)
    .toFixed(3)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1") + "%";
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id } = await params;
  const item = await getItemDetail(Number(id));

  if (!item) notFound();

  return (
    <div className="w-full space-y-8 text-[#e6e0d2]">
      <div className="flex w-full justify-center">
        <ItemDetailPreview item={item} className="max-w-[650px]" />
      </div>

      <div className="w-full space-y-6">
        <RelatedSection
          title="Dropped in Zones"
          items={item.droppedInZones.map((entry) => ({ href: entry.href, label: entry.longName }))}
          fallbackLabel={item.globalDrop && item.droppedInZones.length === 0 ? "Global Drop" : undefined}
          emptyText="No zone drop data recorded."
        />

        <GroupedNpcSection
          title="Dropped by NPCs"
          entries={item.droppedBy.map((entry) => ({
            href: entry.href,
            label: entry.name,
            suffix: `(${formatDropChance(entry.dropChance)} x ${entry.multiplier})`,
            zone: { href: entry.zone.href, label: entry.zone.longName }
          }))}
          fallbackLabel={item.globalDrop && item.droppedBy.length === 0 ? "Global Drop" : undefined}
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
