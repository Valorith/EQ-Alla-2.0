import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@eq-alla/ui";
import { Package2, Search } from "lucide-react";
import { getItemAvailability, getItemDetail, getItemMarketData } from "@eq-alla/data";
import { SectionCard } from "../../../components/catalog-shell";
import { ItemDetailPreview } from "../../../components/item-detail-preview";
import { ItemMarketCard } from "../../../components/item-market-card";
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

function UndiscoveredItemGraphic({ compact = false }: { compact?: boolean }) {
  const frameClassName = compact ? "h-18 w-18" : "h-38 w-38";
  const iconClassName = compact ? "size-8" : "size-16";
  const badgeClassName = compact
    ? "bottom-1 right-1 h-6 min-w-6 px-1.5 text-[0.8rem]"
    : "bottom-3 right-3 h-11 min-w-11 px-2.5 text-[1.35rem]";

  return (
    <div className={`relative ${frameClassName} shrink-0`}>
      <div className="absolute -inset-2 rounded-[34px] bg-[radial-gradient(circle_at_50%_10%,rgba(242,205,121,0.18),transparent_48%),radial-gradient(circle_at_15%_80%,rgba(122,184,255,0.16),transparent_42%)] blur-xl" />
      <div className="absolute inset-0 rounded-[30px] border border-[#d7b06c]/18 bg-[radial-gradient(circle_at_30%_20%,rgba(239,206,123,0.26),transparent_42%),radial-gradient(circle_at_70%_78%,rgba(102,157,214,0.22),transparent_45%),linear-gradient(180deg,rgba(47,54,66,0.98),rgba(21,26,34,0.96))] shadow-[0_24px_58px_rgba(0,0,0,0.38)]" />
      <div className="absolute inset-[1px] rounded-[29px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.015))]" />
      <div className="absolute left-1/2 top-1/2 flex size-[68%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[24px] border border-[#e2c27a]/24 bg-[linear-gradient(180deg,rgba(226,194,122,0.18),rgba(44,50,62,0.24))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_28px_rgba(0,0,0,0.18)]">
        <Package2 className={`${iconClassName} text-[#f0d8a0] drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)]`} strokeWidth={1.8} />
      </div>
      <div
        className={`absolute flex items-center justify-center rounded-full border border-[#f4d58f]/45 bg-[radial-gradient(circle_at_30%_30%,rgba(255,248,220,0.98),rgba(236,192,91,0.82))] font-[var(--font-display)] font-semibold leading-none text-[#3c2a12] shadow-[0_8px_18px_rgba(0,0,0,0.28)] ${badgeClassName}`}
      >
        ?
      </div>
    </div>
  );
}

function UndiscoveredItemState({ itemId }: { itemId: number }) {
  return (
    <div className="w-full space-y-7 text-[#e6e0d2]">
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,29,39,0.96),rgba(15,21,29,0.92))] shadow-[0_22px_56px_rgba(0,0,0,0.28)]">
        <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center lg:p-8 xl:p-10">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#dcb46e]">Item unavailable</p>
              <h1 className="max-w-4xl font-[var(--font-display)] text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl xl:text-[3.4rem]">
                Item {itemId} has not been discovered yet
              </h1>
              <p className="max-w-3xl text-base leading-8 text-slate-300 sm:text-[1.02rem]">
                This item link points to a valid record, but the detail page stays hidden until that item has been discovered in-game.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {["Valid database record", "Read-only for now", "Auto-unlocks later"].map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d7ddeb]"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-start lg:justify-end">
            <div className="flex items-start">
              <UndiscoveredItemGraphic />
            </div>
          </div>
        </div>
      </section>

      <SectionCard
        title="What this means"
        right={
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d7af68]/20 bg-[#d7af68]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e9cd97]">
            <Search className="size-3.5" strokeWidth={2} />
            Read-only by design
          </div>
        }
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5">
            <p className="text-sm leading-8 text-slate-300">
              This record exists in the archive, but its public detail view stays hidden until the item has been discovered in-game. Once that happens, this same URL will open the normal item page automatically.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,29,38,0.82),rgba(13,17,24,0.9))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-start gap-4">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b99a67]">What you can do now</p>
                <h4 className="font-[var(--font-display)] text-xl font-semibold tracking-[-0.03em] text-[#f3ead9]">Keep exploring the archive</h4>
                <p className="text-sm leading-7 text-[#b4bdcc]">
                  You can browse discovered items, search the wider catalog, and revisit this exact URL later once the item becomes publicly visible.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <Link
                href="/items"
                className="group flex items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-[#d7af68]/35 hover:bg-white/[0.05]"
              >
                <div>
                  <p className="text-sm font-semibold text-[#f0e6d6]">Browse discovered items</p>
                  <p className="text-xs leading-5 text-[#98a3b7]">Return to the public item index.</p>
                </div>
                <span className="text-sm font-semibold text-[#dbbd83] transition group-hover:translate-x-0.5">Go</span>
              </Link>

              <Link
                href="/"
                className="group flex items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-[#7ab8ff]/30 hover:bg-white/[0.05]"
              >
                <div>
                  <p className="text-sm font-semibold text-[#f0e6d6]">Search the catalog</p>
                  <p className="text-xs leading-5 text-[#98a3b7]">Explore zones, NPCs, spells, and more.</p>
                </div>
                <span className="text-sm font-semibold text-[#a7d2ff] transition group-hover:translate-x-0.5">Open</span>
              </Link>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id } = await params;
  const itemId = Number(id);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    notFound();
  }

  const availability = await getItemAvailability(itemId);

  if (availability === "missing") {
    notFound();
  }

  if (availability === "undiscovered") {
    return <UndiscoveredItemState itemId={itemId} />;
  }

  const [item, market] = await Promise.all([getItemDetail(itemId), getItemMarketData(itemId)]);

  if (!item) {
    notFound();
  }

  return (
    <div className="w-full space-y-8 text-[#e6e0d2]">
      <div className="mx-auto grid w-full max-w-[1320px] gap-4 xl:grid-cols-[minmax(280px,max-content)_minmax(420px,1fr)] xl:items-start xl:justify-center">
        <div className="xl:justify-self-end">
          <ItemDetailPreview item={item} className="max-w-[650px]" />
        </div>
        <div className="min-w-0">
          <ItemMarketCard itemName={item.name} market={market} />
        </div>
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
