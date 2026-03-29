import Link from "next/link";
import { notFound } from "next/navigation";
import { Compass, Crosshair, Leaf, Shield, Skull, Sparkles, Swords } from "lucide-react";
import { getZoneDetail } from "@eq-alla/data";
import { ZoneResourceLedger } from "../../../components/zone-resource-ledger";

type ZoneDetailPageProps = {
  params: Promise<{ shortName: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ZoneMode = "npcs" | "named" | "items" | "forage";

const modeMeta: Record<ZoneMode, { title: string; description: string }> = {
  npcs: {
    title: "Bestiary",
    description: "Grouped creature roster with level spread, race, class, and encounter disposition."
  },
  named: {
    title: "Named Mobs",
    description: "Focused notable encounter roster for this zone, kept in the same dossier flow."
  },
  items: {
    title: "Equipment List",
    description: "Distinct items that appear on loot tables for creatures in this zone."
  },
  forage: {
    title: "Forage Table",
    description: "Gatherables tied to the zone forage table, including chance and skill floor."
  }
};

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function FactBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b79d72]">{label}</dt>
      <dd className="text-base font-semibold tracking-[-0.02em] text-[#f3ecdf] sm:text-[1.05rem]">{value}</dd>
    </div>
  );
}

function ResourceLink({
  resource,
  active
}: {
  resource: { label: string; href: string; count: number; description?: string };
  active: boolean;
}) {
  return (
    <Link
      href={resource.href}
      aria-current={active ? "page" : undefined}
      className={`group inline-flex min-w-[180px] items-center justify-between gap-3 rounded-full border px-4 py-2.5 transition ${
        active
          ? "border-[#d3ac67]/55 bg-[linear-gradient(180deg,rgba(220,180,110,0.22),rgba(220,180,110,0.1))] shadow-[0_0_0_1px_rgba(220,180,110,0.18)] hover:border-[#e2bf7f]/65"
          : "border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] hover:border-[#d3ac67]/35"
      }`}
    >
      <span className="min-w-0">
        <span className={`block text-sm font-semibold ${active ? "text-white" : "text-[#f0e5d3] group-hover:text-white"}`}>{resource.label}</span>
        {resource.description ? (
          <span className={`block truncate text-[11px] ${active ? "text-[#efe0c2]" : "text-[#d4c2a6] group-hover:text-[#ead9bc]"}`}>
            {resource.description}
          </span>
        ) : null}
      </span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] ${
          active ? "bg-[#1d1711]/45 text-[#f4deb2]" : "bg-black/20 text-[#bda786]"
        }`}
      >
        {formatCount(resource.count)}
      </span>
    </Link>
  );
}

export default async function ZoneDetailPage({ params, searchParams }: ZoneDetailPageProps) {
  const { shortName } = await params;
  const zone = await getZoneDetail(shortName);
  const query = await searchParams;

  if (!zone) notFound();

  const availableModes = zone.resources.flatMap((resource) => (resource.mode ? [resource.mode] : [])) as ZoneMode[];
  const fallbackMode = availableModes.includes("npcs") ? "npcs" : (availableModes[0] ?? "npcs");
  const requestedMode = typeof query.mode === "string" ? query.mode : fallbackMode;
  const mode = availableModes.includes(requestedMode as ZoneMode) ? (requestedMode as ZoneMode) : fallbackMode;

  const modeCounts: Record<ZoneMode, number> = {
    npcs: zone.bestiary.length,
    named: zone.namedNpcs.length,
    items: zone.itemDrops.length,
    forage: zone.forage.length
  };

  const activeMeta = modeMeta[mode];
  const ledgerBestiary = mode === "named" ? zone.bestiary.filter((entry) => entry.named) : zone.bestiary;

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(25,21,18,0.94),rgba(10,13,18,0.98))] shadow-[0_30px_90px_rgba(0,0,0,0.34)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(220,180,110,0.16),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(88,119,168,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_30%)]" />

        <div className="relative z-10 grid gap-0 xl:grid-cols-[minmax(0,1.08fr)_340px]">
          <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-7 xl:px-8 xl:py-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d7b371]">
                <span>Zone Dossier</span>
                <span className="rounded-full border border-white/12 bg-white/6 px-2.5 py-1 text-[#cfb186]">{zone.shortName}</span>
                <span className="rounded-full border border-white/12 bg-white/6 px-2.5 py-1 text-[#cfb186]">{zone.era}</span>
                {zone.hotzone ? (
                  <span className="rounded-full border border-[#df7658]/55 bg-[#df7658]/18 px-2.5 py-1 text-[#ffd0c0]">Hotzone</span>
                ) : null}
              </div>

              <div className="space-y-3">
                <h1 className="font-[var(--font-display)] text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl xl:text-[2.95rem]">
                  {zone.longName}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-[#ddd2c2] sm:text-[15px]">{zone.population}</p>
              </div>
            </div>

            <dl className="grid gap-x-8 gap-y-5 border-y border-white/10 py-5 sm:grid-cols-2 xl:grid-cols-3">
              <FactBlock label="Recommended Range" value={zone.levelRange} />
              <FactBlock label="Encounter Spread" value={zone.encounterRange} />
              <FactBlock label="Safe Point" value={zone.safePoint} />
              <FactBlock label="Bestiary" value={`${formatCount(zone.bestiary.length)} entries`} />
              <FactBlock label="Notable Encounters" value={`${formatCount(zone.namedNpcs.length)} indexed`} />
              <FactBlock label="Zone Equipment" value={`${formatCount(zone.itemDrops.length)} drops`} />
            </dl>
          </div>

          <aside className="border-t border-white/10 px-5 py-6 sm:px-7 xl:border-l xl:border-t-0 xl:px-6 xl:py-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b99a67]">Scouting Notes</p>
                <div className="space-y-3 text-sm text-[#e8dccb]">
                  <div className="flex items-center gap-3">
                    <Compass className="size-4 text-[#dcb46e]" />
                    <span>{zone.era} era zone record</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Crosshair className="size-4 text-[#dcb46e]" />
                    <span>Succor at {zone.safePoint}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sparkles className="size-4 text-[#dcb46e]" />
                    <span>{formatCount(zone.namedNpcs.length)} notable encounters indexed</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-white/10 pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b99a67]">Zone Rules</p>
                <div className="flex flex-wrap gap-2">
                  {zone.rules.map((rule) => (
                    <span
                      key={rule}
                      className="inline-flex rounded-full border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-3 py-1.5 text-[12px] font-medium text-[#eadfce]"
                    >
                      {rule}
                    </span>
                  ))}
                </div>
              </div>

              {zone.namedNpcs.length > 0 ? (
                <div className="space-y-3 border-t border-white/10 pt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b99a67]">Notable Encounters</p>
                  <div className="space-y-2">
                    {zone.namedNpcs.slice(0, 6).map((entry) => (
                      <Link
                        key={entry.id}
                        href={entry.href}
                        className="group flex items-center gap-3 text-sm transition hover:text-white visited:text-[#f4e9d8]"
                      >
                        <Skull className="size-3.5 shrink-0 text-[#dcb46e]" />
                        <span className="truncate text-[#f4e9d8] group-hover:text-white">{entry.name}</span>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href={`/zones/${zone.shortName}?mode=named`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#edca88] transition hover:text-[#f5d9a6] visited:text-[#edca88]"
                  >
                    View the full named list
                  </Link>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <section className="space-y-3">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#b79d72]">Resources</p>
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {zone.resources.map((resource) => (
              <ResourceLink key={resource.href} resource={resource} active={Boolean(resource.mode && resource.mode === mode)} />
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(14,18,25,0.94),rgba(8,11,16,0.98))] shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
        <div className="border-b border-white/10 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b99a67]">Resource View</p>
              <h2 className="font-[var(--font-display)] text-[1.8rem] font-semibold tracking-[-0.04em] text-white">{activeMeta.title}</h2>
              <p className="max-w-3xl text-sm leading-7 text-[#d8cebf]">{activeMeta.description}</p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-[#e5d9c8]">
              <span className="inline-flex items-center gap-2">
                {mode === "npcs" ? <Swords className="size-4 text-[#dcb46e]" /> : null}
                {mode === "named" ? <Skull className="size-4 text-[#dcb46e]" /> : null}
                {mode === "items" ? <Shield className="size-4 text-[#dcb46e]" /> : null}
                {mode === "forage" ? <Leaf className="size-4 text-[#dcb46e]" /> : null}
                <span>{formatCount(modeCounts[mode])} entries</span>
              </span>
            </div>
          </div>
        </div>

        <ZoneResourceLedger mode={mode} bestiary={ledgerBestiary} itemDrops={zone.itemDrops} forage={zone.forage} />
      </section>
    </div>
  );
}
