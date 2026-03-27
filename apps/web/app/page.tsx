import Link from "next/link";
import { getCatalogStats, getSourceMode, listZoneEras } from "@eq-alla/data";
import { Badge, Button } from "@eq-alla/ui";
import { DefinitionGrid, LinkList, PageHero, SectionCard } from "../components/catalog";

export default async function HomePage() {
  const stats = await getCatalogStats();
  const eras = await listZoneEras();

  return (
    <>
      <PageHero
        eyebrow="Read-only EverQuest archive"
        title="Norrath research, rebuilt in a cleaner Spire-inspired shell"
        description="This rebuild keeps the Alla-style purpose and route coverage, but moves the experience into a more structured sidebar, denser browse flows, and cleaner data surfaces that feel closer to Spire."
        badges={[`Mode: ${getSourceMode()}`, "Legacy route support", "Responsive shell", "API-ready"]}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/search?q=mistmoore">Search archive</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/zones/by-era">Browse eras</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Catalog coverage">
          <DefinitionGrid
            items={[
              { label: "Items", value: stats.items },
              { label: "Spells", value: stats.spells },
              { label: "NPCs", value: stats.npcs },
              { label: "Zones", value: stats.zones },
              { label: "Factions", value: stats.factions },
              { label: "Recipes", value: stats.recipes },
              { label: "Pets", value: stats.pets },
              { label: "Tasks", value: stats.tasks }
            ]}
          />
        </SectionCard>

        <SectionCard title="Era navigation">
          <div className="grid gap-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(18,24,35,0.98),rgba(37,48,67,0.96))] p-5 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#dcb46e]">Expansion view</p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.03em]">Browse zone coverage by era</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Preserve the classic zonelist flow while giving expansion browsing a cleaner landing point.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {eras.map((era) => (
                  <Badge key={era} className="border-white/12 bg-white/10 text-slate-100">
                    <Link href={`/zones/by-era/${encodeURIComponent(era.toLowerCase())}`}>{era}</Link>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Route posture</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">Legacy URLs still land cleanly</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Existing `?a=` links and special pages redirect into the new route model without exposing old PHP patterns.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Search posture</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">One archive-wide entry point</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Items, spells, NPCs, zones, factions, recipes, pets, and tasks stay reachable from a single search flow.
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Primary workflows">
          <LinkList
            items={[
              { href: "/items", label: "Item search", meta: "Filter equipment, tradeable items, slots, and class usage." },
              { href: "/spells", label: "Spell search", meta: "Browse spells by class, level, role, and effect profile." },
              { href: "/npcs/advanced", label: "Advanced NPC search", meta: "Use level, race, named, and zone filters to narrow bestiary results." },
              { href: "/zones/by-level", label: "Zones by level", meta: "Browse progression-oriented zone groupings for leveling and research." }
            ]}
          />
        </SectionCard>

        <SectionCard title="Platform highlights">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Data layer</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">Typed read services</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Pages already consume stable view models instead of raw schema rows, so live SQL can replace mocks without reworking the UI contracts.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Operations</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">VPS-friendly deployment</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Docker, Caddy, Redis integration, and `/api/health` are already in place for a conventional self-hosted stack.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Compatibility</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">Alla parity surface</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                The current scaffold already covers home, search, entity pages, special zone views, recipes, pets, tasks, and spawn group detail routes.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Next step</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">Swap in live EQEmu data</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Replace the mock catalog with full MySQL-backed mappings while keeping the route model and current visual shell intact.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
