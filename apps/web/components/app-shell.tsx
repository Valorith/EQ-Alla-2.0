"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Input } from "@eq-alla/ui";
import { cn } from "@eq-alla/ui";
import { ArrowRight, Database, Menu, Search, Settings2, ShieldCheck, X } from "lucide-react";
import { ItemHoverTooltip } from "./item-hover-tooltip";
import { RouteLoadingOverlay } from "./route-loading-overlay";
import { usePageLoadingPreference } from "./use-page-loading-preference";

const routesWithInlineSearch = new Set([
  "/",
  "/crafted-spells",
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
  onNavigate,
  onOpenSettings
}: {
  showSidebarSearch: boolean;
  navGroups: NavGroup[];
  footerClassName: string;
  onNavigate?: () => void;
  onOpenSettings: () => void;
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

        <div className="flex justify-end pt-1">
          <button
            type="button"
            aria-label="Open settings"
            title="Settings"
            onClick={onOpenSettings}
            className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/62 transition hover:bg-white/12 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <Settings2 className="size-4" strokeWidth={2.15} />
          </button>
        </div>
      </div>
    </>
  );
}

function SettingsModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { isPageLoadingEnabled, setIsPageLoadingEnabled } = usePageLoadingPreference();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#06080d]/72 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="eq-settings-title"
        className="w-full max-w-md rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(20,24,31,0.98),rgba(34,28,24,0.96))] p-5 text-[#f3ecdf] shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#d7c7aa]/72">Preferences</p>
            <h2 id="eq-settings-title" className="mt-2 font-[var(--font-display)] text-2xl font-semibold tracking-[-0.03em] text-white">
              Settings
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#dccfb7]/82">
              Control small browser-side behaviors without changing the rest of the site.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/72 transition hover:bg-white/12 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <X className="size-4" strokeWidth={2.2} />
          </button>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-black/18 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Page loading animation</p>
              <p className="mt-1 text-sm leading-6 text-[#dccfb7]/76">
                Shows the full-page gnome animation during route transitions and loading boundaries.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isPageLoadingEnabled}
              aria-label="Toggle page loading animation"
              onClick={() => setIsPageLoadingEnabled(!isPageLoadingEnabled)}
              className={cn(
                "relative mt-1 inline-flex h-7 w-12 shrink-0 rounded-full border transition focus:outline-none focus:ring-2 focus:ring-[#f0c36a]/45",
                isPageLoadingEnabled
                  ? "border-[#f0c36a]/55 bg-[linear-gradient(180deg,rgba(240,195,106,0.92),rgba(183,126,56,0.95))]"
                  : "border-white/12 bg-white/10"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-[3px] size-5 rounded-full bg-[#0f131a] shadow-[0_4px_16px_rgba(0,0,0,0.32)] transition-transform",
                  isPageLoadingEnabled ? "translate-x-[25px]" : "translate-x-[3px]"
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const showSidebarSearch = !routesWithInlineSearch.has(pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  const mainShellClassName = isHome
    ? "min-w-0 xl:col-[1/-1] xl:row-start-1 xl:self-start"
    : "min-w-0 w-full rounded-[28px] border border-white/10 bg-black/20 p-3 backdrop-blur-sm xl:max-w-[1320px] xl:min-h-0 xl:justify-self-center xl:self-stretch xl:p-4";
  const desktopGridClassName = isHome
    ? "relative z-50 grid gap-4 xl:h-full xl:grid-cols-[290px_minmax(0,1fr)] xl:items-start xl:overflow-hidden"
    : "relative z-50 grid gap-4 xl:h-full xl:grid-cols-[290px_minmax(0,1fr)] xl:items-stretch xl:overflow-hidden";

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
        { href: "/crafted-spells", label: "Crafted Spells" },
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
  const openSettings = () => {
    setMobileNavOpen(false);
    setSettingsOpen(true);
  };
  const closeSettings = () => setSettingsOpen(false);

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
    if (!mobileNavOpen && !settingsOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen, settingsOpen]);

  const routeWheelToMainScroll = (event: React.WheelEvent<HTMLDivElement>) => {
    if (typeof window === "undefined" || !window.matchMedia("(min-width: 1280px)").matches) {
      return;
    }

    const mainScrollElement = mainScrollRef.current;
    const target = event.target;

    if (!mainScrollElement || !(target instanceof HTMLElement) || mainScrollElement.contains(target)) {
      return;
    }

    let current: HTMLElement | null = target;
    while (current && current !== event.currentTarget) {
      const style = window.getComputedStyle(current);
      const overflowY = style.overflowY;
      const isScrollableY =
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") && current.scrollHeight > current.clientHeight + 1;

      if (isScrollableY) {
        const canScrollUp = current.scrollTop > 0;
        const canScrollDown = current.scrollTop + current.clientHeight < current.scrollHeight - 1;

        if ((event.deltaY < 0 && canScrollUp) || (event.deltaY > 0 && canScrollDown)) {
          return;
        }
      }

      current = current.parentElement;
    }

    const canScrollMainUp = mainScrollElement.scrollTop > 0;
    const canScrollMainDown = mainScrollElement.scrollTop + mainScrollElement.clientHeight < mainScrollElement.scrollHeight - 1;

    if ((event.deltaY < 0 && !canScrollMainUp) || (event.deltaY > 0 && !canScrollMainDown)) {
      return;
    }

    event.preventDefault();
    mainScrollElement.scrollBy({
      top: event.deltaY,
      left: event.deltaX
    });
  };

  return (
    <div className="eq-app-shell-padding min-h-screen xl:h-dvh xl:overflow-hidden">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] xl:hidden"
          onClick={closeMobileNav}
        />
      ) : null}

      <div
        className={desktopGridClassName}
        onWheelCapture={routeWheelToMainScroll}
      >
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
                  onOpenSettings={openSettings}
                />
              </div>
            </div>
          </div>
        </header>

        <aside
          className={
            isHome ? "hidden xl:block xl:h-full xl:min-h-0 xl:col-start-1 xl:row-start-1 xl:relative xl:z-10" : "hidden xl:block xl:h-full xl:min-h-0"
          }
        >
          <div className="eq-sidebar-surface eq-shell-glow overflow-hidden rounded-[26px] border border-[var(--sidebar-border)] xl:h-full">
            <div className="eq-scroll-pane relative z-10 flex min-h-0 flex-col gap-6 p-5 text-[var(--sidebar-text)] xl:h-full xl:overflow-y-auto">
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
                onOpenSettings={openSettings}
              />
            </div>
          </div>
        </aside>

        <main ref={mainScrollRef} className={`eq-scroll-pane ${mainShellClassName} xl:min-h-0 xl:h-full xl:overflow-y-auto xl:overscroll-contain`}>
          <div className={isHome ? "flex min-w-0 flex-col" : "flex min-w-0 flex-col gap-4"}>{children}</div>
        </main>
      </div>
      <ItemHoverTooltip />
      <SettingsModal isOpen={settingsOpen} onClose={closeSettings} />
      <Suspense fallback={null}>
        <RouteLoadingOverlay />
      </Suspense>
    </div>
  );
}
