"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Input } from "@eq-alla/ui";
import { cn } from "@eq-alla/ui";
import { ArrowRight, Database, Menu, Search, ShieldCheck, X } from "lucide-react";
import { ItemHoverTooltip } from "./item-hover-tooltip";
import { RouteLoadingOverlay } from "./route-loading-overlay";

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

type NavGroup = {
  label: string;
  items: { href: string; label: string }[];
};

function SidebarNavContent({
  showSidebarSearch,
  navGroups,
  footerClassName,
  onNavigate
}: {
  showSidebarSearch: boolean;
  navGroups: NavGroup[];
  footerClassName: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {showSidebarSearch ? (
        <form
          action="/"
          className="space-y-3"
          onSubmit={() => {
            onNavigate?.();
          }}
        >
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

      <nav className="grid gap-5" aria-label="Site">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sidebar-muted)]">{group.label}</p>
            <div className="grid gap-1.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className="group flex min-h-11 items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-white/88 transition hover:bg-white/10 hover:text-white"
                >
                  <span>{item.label}</span>
                  <ArrowRight className="size-4 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/85" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={footerClassName}>
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
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const showSidebarSearch = !routesWithInlineSearch.has(pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const mainShellClassName = isHome
    ? "min-w-0 xl:col-[1/-1] xl:row-start-1 xl:self-start"
    : "min-w-0 w-full rounded-[28px] border border-white/10 bg-black/20 p-3 backdrop-blur-sm xl:max-w-[1320px] xl:justify-self-center xl:self-start xl:p-4";

  const navGroups: NavGroup[] = [
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

  const closeMobileNav = () => setMobileNavOpen(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const onChange = () => {
      if (mq.matches) setMobileNavOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <div className="eq-app-shell-padding min-h-screen">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] xl:hidden"
          onClick={closeMobileNav}
        />
      ) : null}

      <div className="relative z-50 grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)] xl:items-start">
        <header className="xl:hidden">
          <div className="eq-sidebar-surface eq-shell-glow sticky top-0 overflow-hidden rounded-[22px] border border-[var(--sidebar-border)] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
            <div className="relative z-10 flex items-center justify-between gap-3 px-4 py-3 text-[var(--sidebar-text)]">
              <Link href="/" className="min-w-0" onClick={closeMobileNav}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--sidebar-muted)]">EQEmu compendium</p>
                <div className="mt-1 flex items-end gap-1.5">
                  <span className="eq-wordmark truncate text-[1.65rem] font-semibold leading-none text-[#f3c54f]">EQ Alla</span>
                  <span className="shrink-0 pb-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f0d8a0]/80">2.0</span>
                </div>
              </Link>
              <button
                type="button"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/14 bg-white/8 text-white transition hover:bg-white/14"
                aria-expanded={mobileNavOpen}
                aria-controls="eq-mobile-nav-panel"
                aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
                onClick={() => setMobileNavOpen((open) => !open)}
              >
                {mobileNavOpen ? <X className="size-5" strokeWidth={2.25} /> : <Menu className="size-5" strokeWidth={2.25} />}
              </button>
            </div>

            <div
              id="eq-mobile-nav-panel"
              className={cn(
                "border-t border-white/10 transition-[max-height] duration-300 ease-out",
                mobileNavOpen ? "max-h-[min(78dvh,640px)]" : "max-h-0 overflow-hidden border-t-transparent"
              )}
            >
              <div className="max-h-[min(78dvh,640px)] overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
                <SidebarNavContent
                  showSidebarSearch={showSidebarSearch}
                  navGroups={navGroups}
                  footerClassName="mt-4 grid gap-3"
                  onNavigate={closeMobileNav}
                />
              </div>
            </div>
          </div>
        </header>

        <aside className={isHome ? "hidden xl:block xl:col-start-1 xl:row-start-1 xl:relative xl:z-10" : "hidden xl:block"}>
          <div className="eq-sidebar-surface eq-shell-glow sticky top-3 overflow-hidden rounded-[26px] border border-[var(--sidebar-border)]">
            <div className="relative z-10 flex min-h-[calc(100dvh-1.5rem)] flex-col gap-6 p-5 text-[var(--sidebar-text)]">
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

              <SidebarNavContent
                showSidebarSearch={showSidebarSearch}
                navGroups={navGroups}
                footerClassName="mt-auto grid gap-3"
              />
            </div>
          </div>
        </aside>

        <main className={mainShellClassName}>
          <div className={isHome ? "flex min-w-0 flex-col" : "flex min-w-0 flex-col gap-4"}>{children}</div>
        </main>
      </div>
      <ItemHoverTooltip />
      <Suspense fallback={null}>
        <RouteLoadingOverlay />
      </Suspense>
    </div>
  );
}
