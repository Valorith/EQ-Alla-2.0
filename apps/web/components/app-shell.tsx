"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Input } from "@eq-alla/ui";
import { ArrowRight, Database, Search, ShieldCheck } from "lucide-react";
import { ItemHoverTooltip } from "./item-hover-tooltip";

const routesWithInlineSearch = new Set([
  "/",
  "/items",
  "/spells",
  "/npcs",
  "/zones",
  "/factions",
  "/recipes",
  "/pets"
]);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const showSidebarSearch = !routesWithInlineSearch.has(pathname);

  const navGroups = [
    {
      label: "Archive",
      items: [
        { href: "/items", label: "Items" },
        { href: "/spells", label: "Spells" },
        { href: "/npcs", label: "NPCs" },
        { href: "/zones", label: "Zones" }
      ]
    },
    {
      label: "Reference",
      items: [
        { href: "/factions", label: "Factions" },
        { href: "/recipes", label: "Recipes" },
        { href: "/pets", label: "Pets" }
      ]
    },
    {
      label: "Browse",
      items: [
        { href: "/zones/by-level", label: "Zones by Level" },
        { href: "/zones/by-era", label: "Zones by Era" }
      ]
    }
  ];

  return (
    <div className="mx-auto min-h-screen max-w-[1680px] px-3 py-3 md:px-5 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
        <aside>
          <div className="eq-sidebar-surface eq-shell-glow sticky top-3 overflow-hidden rounded-[26px] border border-[var(--sidebar-border)]">
            <div className="relative z-10 flex min-h-[calc(100vh-1.5rem)] flex-col gap-6 p-5 text-[var(--sidebar-text)]">
              <div className="space-y-4">
                <Link href="/" className="block">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--sidebar-muted)]">
                    Searchable EQEmu Knowledge Compendium
                  </p>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="eq-wordmark text-[2.45rem] font-semibold leading-none text-[#f3c54f]">EQ Alla</span>
                    <span className="pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f0d8a0]/80">2.0</span>
                  </div>
                </Link>
              </div>

              {showSidebarSearch ? (
                <form action="/" className="space-y-3">
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sidebar-muted)]">
                    Search the archive
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/45" />
                    <Input
                      type="search"
                      name="q"
                      placeholder="Search zones, NPCs, items..."
                      className="border-white/12 bg-white/10 pl-11 text-white placeholder:text-white/45 focus:border-[#f0c36a] focus:bg-white/14"
                    />
                  </div>
                </form>
              ) : null}

              <nav className="grid gap-5">
                {navGroups.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sidebar-muted)]">{group.label}</p>
                    <div className="grid gap-1.5">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-white/88 transition hover:bg-white/10 hover:text-white"
                        >
                          <span>{item.label}</span>
                          <ArrowRight className="size-4 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/85" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="mt-auto grid gap-3">
                <div className="rounded-2xl border border-white/12 bg-black/18 p-4 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-emerald-400/12">
                      <ShieldCheck className="size-4 text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Read-only by design</p>
                      <p className="mt-1 text-xs leading-5 text-white/70">
                        Built directly on mirrored EQEmu data with live database-backed pages and search.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/12 bg-black/18 p-4 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-[#f3c54f]/14">
                      <Database className="size-4 text-[#f3c54f]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Legacy links preserved</p>
                      <p className="mt-1 text-xs leading-5 text-white/70">
                        Old `?a=` links, task pages, and spawngroup routes redirect into the new information architecture.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main
          className={
            isHome
              ? "min-w-0"
              : "min-w-0 rounded-[28px] border border-white/10 bg-black/20 p-3 backdrop-blur-sm xl:p-4"
          }
        >
          <div className={isHome ? "flex min-w-0 flex-col" : "flex min-w-0 flex-col gap-4"}>{children}</div>
        </main>
      </div>
      <ItemHoverTooltip />
    </div>
  );
}
