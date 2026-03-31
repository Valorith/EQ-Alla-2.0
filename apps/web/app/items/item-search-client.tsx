"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ItemSummary } from "@eq-alla/data";
import { itemTypeFilterOptions } from "@eq-alla/data/item-types";
import { Button, Input } from "@eq-alla/ui";
import { PaginationControls, SearchPrompt, SectionCard, SimpleTable } from "../../components/catalog-shell";
import { ClassLoadingIndicator } from "../../components/class-loading-indicator";
import { ItemIcon } from "../../components/item-icon";

type ItemSearchFilters = {
  q: string;
  className: string;
  slot: string;
  type: string;
  minLevel: string;
  maxLevel: string;
  tradeable: string;
};

type ItemSearchClientProps = {
  initialFilters: ItemSearchFilters;
  initialItems: ItemSummary[];
  initialResultsResolved: boolean;
  frameClassName: string;
};

type SearchResolutionMeta = {
  key: string;
  durationMs: number;
  source: "network" | "cache";
};

const itemSearchDebounceMs = 500;
const itemSearchAutoQueryMinLength = 3;
const itemResultsPerPage = 25;

type ClientCacheEntry = {
  expiresAt: number;
  items: ItemSummary[];
  touchedAt: number;
};

const clientResultCache = new Map<string, ClientCacheEntry>();
const clientCacheTtlMs = 180_000;
const clientCacheMaxEntries = 8;
const clientSessionStorageKey = "eq-item-search-cache";
let clientCacheHydrated = false;

function buildSearchParams(filters: ItemSearchFilters) {
  const params = new URLSearchParams();
  const query = filters.q.trim();

  if (query) {
    params.set("q", query);
  }

  if (filters.className) params.set("class", filters.className);
  if (filters.slot) params.set("slot", filters.slot);
  if (filters.type) params.set("type", filters.type);
  if (filters.minLevel) params.set("minLevel", filters.minLevel);
  if (filters.maxLevel) params.set("maxLevel", filters.maxLevel);
  if (filters.tradeable) params.set("tradeable", filters.tradeable);

  return params;
}

function hasActiveFilters(filters: ItemSearchFilters) {
  return (
    filters.q.trim().length > 0 ||
    filters.className.length > 0 ||
    filters.slot.length > 0 ||
    filters.type.length > 0 ||
    filters.minLevel.length > 0 ||
    filters.maxLevel.length > 0 ||
    filters.tradeable.length > 0
  );
}

function hasAutoSearchableQuery(filters: ItemSearchFilters) {
  return filters.q.trim().length >= itemSearchAutoQueryMinLength;
}

function formatDuration(durationMs: number) {
  if (durationMs < 1_000) {
    return `${Math.max(1, Math.round(durationMs))}ms`;
  }

  return `${(durationMs / 1_000).toFixed(durationMs >= 10_000 ? 1 : 2)}s`;
}

function persistClientCache() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload = Object.fromEntries(clientResultCache.entries());
    window.sessionStorage.setItem(clientSessionStorageKey, JSON.stringify(payload));
  } catch {
    // Ignore storage failures and keep the in-memory cache hot.
  }
}

function pruneClientCache(now = Date.now()) {
  for (const [key, entry] of clientResultCache.entries()) {
    if (entry.expiresAt < now) {
      clientResultCache.delete(key);
    }
  }

  if (clientResultCache.size <= clientCacheMaxEntries) {
    return;
  }

  const oldestEntries = [...clientResultCache.entries()]
    .sort((left, right) => left[1].touchedAt - right[1].touchedAt)
    .slice(0, clientResultCache.size - clientCacheMaxEntries);

  for (const [key] of oldestEntries) {
    clientResultCache.delete(key);
  }
}

function hydrateClientCache() {
  if (clientCacheHydrated || typeof window === "undefined") {
    return;
  }

  clientCacheHydrated = true;

  const payload = window.sessionStorage.getItem(clientSessionStorageKey);
  if (!payload) {
    return;
  }

  try {
    const parsed = JSON.parse(payload) as Record<string, ClientCacheEntry>;
    const now = Date.now();

    for (const [key, entry] of Object.entries(parsed)) {
      if (entry && Array.isArray(entry.items) && typeof entry.expiresAt === "number") {
        clientResultCache.set(key, {
          expiresAt: entry.expiresAt,
          items: entry.items,
          touchedAt: typeof entry.touchedAt === "number" ? entry.touchedAt : now
        });
      }
    }

    pruneClientCache(now);
    persistClientCache();
  } catch {
    window.sessionStorage.removeItem(clientSessionStorageKey);
  }
}

function getClientCachedItems(key: string) {
  hydrateClientCache();

  const entry = clientResultCache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt < Date.now()) {
    clientResultCache.delete(key);
    persistClientCache();
    return null;
  }

  entry.touchedAt = Date.now();
  return entry.items;
}

function setClientCachedItems(key: string, items: ItemSummary[]) {
  hydrateClientCache();

  clientResultCache.set(key, {
    expiresAt: Date.now() + clientCacheTtlMs,
    items,
    touchedAt: Date.now()
  });

  pruneClientCache();
  persistClientCache();
}

function canReuseCurrentFilters(current: ItemSearchFilters, next: ItemSearchFilters) {
  return (
    current.className === next.className &&
    current.slot === next.slot &&
    current.type === next.type &&
    current.minLevel === next.minLevel &&
    current.maxLevel === next.maxLevel &&
    current.tradeable === next.tradeable
  );
}

function previewItemsFromCurrent(items: ItemSummary[], current: ItemSearchFilters, next: ItemSearchFilters) {
  const currentQuery = current.q.trim().toLowerCase();
  const nextQuery = next.q.trim().toLowerCase();

  if (!currentQuery || !nextQuery || !nextQuery.startsWith(currentQuery) || !canReuseCurrentFilters(current, next)) {
    return null;
  }

  return items.filter((item) => item.name.toLowerCase().includes(nextQuery));
}

function SelectControl({
  label,
  name,
  value,
  options,
  onChange
}: {
  label: string;
  name: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{label}</span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-[var(--border-strong)] bg-white/94 px-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_rgba(215,164,95,0.12)]"
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ItemSearchClient({ initialFilters, initialItems, initialResultsResolved, frameClassName }: ItemSearchClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(hasActiveFilters(initialFilters) && !initialResultsResolved);
  const [displayKey, setDisplayKey] = useState(initialResultsResolved ? buildSearchParams(initialFilters).toString() : "");
  const [resolutionMeta, setResolutionMeta] = useState<SearchResolutionMeta | null>(null);
  const [submitCount, setSubmitCount] = useState(hasActiveFilters(initialFilters) && !initialResultsResolved ? 1 : 0);
  const [awaitingManualSubmit, setAwaitingManualSubmit] = useState(false);
  const [page, setPage] = useState(1);
  const abortRef = useRef<AbortController | null>(null);
  const currentUrlKeyRef = useRef(buildSearchParams(initialFilters).toString());
  const lastResolvedFiltersRef = useRef(initialFilters);
  const lastHandledSubmitRef = useRef(0);

  useEffect(() => {
    if (initialResultsResolved) {
      const key = buildSearchParams(initialFilters).toString();
      if (key) {
        setClientCachedItems(key, initialItems);
        setResolutionMeta({
          key,
          durationMs: 0,
          source: "cache"
        });
      }
    }
  }, [initialFilters, initialItems, initialResultsResolved]);

  useEffect(() => {
    if (initialResultsResolved) {
      return;
    }

    const key = buildSearchParams(initialFilters).toString();
    if (!key) {
      return;
    }

    const cachedItems = getClientCachedItems(key);
    if (!cachedItems) {
      return;
    }

    setItems(cachedItems);
    setError(null);
    setDisplayKey(key);
    setIsFetching(false);
    lastResolvedFiltersRef.current = initialFilters;
    setResolutionMeta({
      key,
      durationMs: 0,
      source: "cache"
    });
  }, [initialFilters, initialResultsResolved]);

  const setFilter = (key: keyof ItemSearchFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const submitSearch = () => {
    if (!hasActiveFilters(filters)) {
      return;
    }

    setSubmitCount((current) => current + 1);
  };

  const clearFilters = () => {
    setFilters({
      q: "",
      className: "",
      slot: "",
      type: "",
      minLevel: "",
      maxLevel: "",
      tradeable: ""
    });
  };

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    const isForcedSearch = submitCount !== lastHandledSubmitRef.current;
    const timer = window.setTimeout(() => {
      if (isForcedSearch) {
        lastHandledSubmitRef.current = submitCount;
      }

      const nextKey = buildSearchParams(filters).toString();
      const nextHref = nextKey ? `${pathname}?${nextKey}` : pathname;

      if (nextKey !== currentUrlKeyRef.current) {
        currentUrlKeyRef.current = nextKey;
        startTransition(() => {
          router.replace(nextHref, { scroll: false });
        });
      }

      if (nextKey === displayKey && !isForcedSearch) {
        return;
      }

      abortRef.current?.abort();

      if (!hasActiveFilters(filters)) {
        setItems([]);
        setError(null);
        setDisplayKey(nextKey);
        setIsFetching(false);
        setResolutionMeta(null);
        setAwaitingManualSubmit(false);
        return;
      }

      if (!isForcedSearch && !hasAutoSearchableQuery(filters)) {
        setItems([]);
        setError(null);
        setDisplayKey(nextKey);
        setIsFetching(false);
        setResolutionMeta(null);
        setAwaitingManualSubmit(true);
        return;
      }

      setAwaitingManualSubmit(false);
      const startedAt = performance.now();
      const cachedItems = getClientCachedItems(nextKey);
      if (cachedItems) {
        setItems(cachedItems);
        setDisplayKey(nextKey);
        setError(null);
        setIsFetching(false);
        lastResolvedFiltersRef.current = filters;
        setResolutionMeta({
          key: nextKey,
          durationMs: performance.now() - startedAt,
          source: "cache"
        });
        return;
      }

      const previewItems = previewItemsFromCurrent(items, lastResolvedFiltersRef.current, filters);
      if (previewItems) {
        setItems(previewItems);
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setIsFetching(true);
      setError(null);

      void (async () => {
        try {
          const response = await fetch(`/api/items?${nextKey}`, {
            signal: controller.signal
          });

          if (!response.ok) {
            throw new Error(`Search failed with ${response.status}`);
          }

          const payload = (await response.json()) as { data?: ItemSummary[] };

          if (controller.signal.aborted) {
            return;
          }

          setItems(payload.data ?? []);
          setDisplayKey(nextKey);
          setClientCachedItems(nextKey, payload.data ?? []);
          lastResolvedFiltersRef.current = filters;
          setResolutionMeta({
            key: nextKey,
            durationMs: performance.now() - startedAt,
            source: "network"
          });
        } catch (searchError) {
          if (controller.signal.aborted) {
            return;
          }

          console.error(searchError);
          setError("Could not refresh item results. Showing the last successful search.");
        } finally {
          if (abortRef.current === controller) {
            abortRef.current = null;
            setIsFetching(false);
          }
        }
      })();
    }, isForcedSearch ? 0 : itemSearchDebounceMs);

    return () => window.clearTimeout(timer);
  }, [displayKey, filters, pathname, router, submitCount]);

  const activeQuery = filters.q.trim();
  const totalPages = Math.max(1, Math.ceil(items.length / itemResultsPerPage));
  const visiblePage = Math.min(page, totalPages);
  const pagedItems = items.slice((visiblePage - 1) * itemResultsPerPage, visiblePage * itemResultsPerPage);
  const hasShortQuery = activeQuery.length > 0 && activeQuery.length < itemSearchAutoQueryMinLength;
  const draftKey = buildSearchParams(filters).toString();
  const showResults = hasActiveFilters(filters) || isFetching || displayKey.length > 0;
  const resultTitle = showResults ? (isFetching && items.length === 0 ? "Loading items" : `${items.length} matching items`) : "Results";
  const statusLabel = error ? error : isFetching ? "Refreshing results..." : draftKey === displayKey && displayKey ? "Filters applied" : "Press Search to apply filters";
  const resolvedTiming =
    resolutionMeta && resolutionMeta.key === displayKey && !isFetching
      ? `Loaded in ${formatDuration(resolutionMeta.durationMs)}${resolutionMeta.source === "cache" ? " from cache" : ""}`
      : null;

  useEffect(() => {
    setPage(1);
  }, [displayKey]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <>
      <SectionCard
        title="Filters"
        className={frameClassName}
        right={<p className="text-xs font-medium text-[#ccb594]">{statusLabel}</p>}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Name</span>
            <Input
              name="q"
              type="search"
              value={filters.q}
              onChange={(event) => setFilter("q", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitSearch();
                }
              }}
              placeholder="Runed Mithril..."
            />
          </label>
          <SelectControl
            label="Class"
            name="class"
            value={filters.className}
            onChange={(value) => setFilter("className", value)}
            options={["Warrior", "Paladin", "Cleric", "Wizard", "Shaman"]}
          />
          <SelectControl label="Slot" name="slot" value={filters.slot} onChange={(value) => setFilter("slot", value)} options={["Wrist", "Primary", "Inventory"]} />
          <SelectControl
            label="Item type"
            name="type"
            value={filters.type}
            onChange={(value) => setFilter("type", value)}
            options={itemTypeFilterOptions}
          />
          <SelectControl
            label="Min level"
            name="minLevel"
            value={filters.minLevel}
            onChange={(value) => setFilter("minLevel", value)}
            options={["1", "20", "35", "50", "60"]}
          />
          <SelectControl
            label="Max level"
            name="maxLevel"
            value={filters.maxLevel}
            onChange={(value) => setFilter("maxLevel", value)}
            options={["20", "35", "50", "60", "65"]}
          />
          <SelectControl
            label="Tradeable"
            name="tradeable"
            value={filters.tradeable}
            onChange={(value) => setFilter("tradeable", value)}
            options={["true", "false"]}
          />
          <div className="flex items-end gap-3 md:col-span-2 xl:col-span-4">
            <Button type="button" className="w-full sm:w-auto" onClick={submitSearch}>
              Search
            </Button>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={resultTitle} className={frameClassName}>
        {showResults && items.length > 0 ? (
          <>
            <SimpleTable
              columns={["Icon", "Item", "Type", "AC", "HP", "Mana", "Damage", "Delay", "Item ID"]}
              rows={pagedItems.map((item) => [
                <ItemIcon key={`${item.id}-icon`} icon={item.icon} name={item.name} size="sm" tooltipItemId={item.id} />,
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
                  className="font-medium text-[#f1e8d6] underline decoration-[#c9a772]/0 underline-offset-2 transition hover:text-[#fff5e2] hover:decoration-[#c9a772]/70"
                >
                  {item.name}
                </Link>,
                item.type,
                item.ac || "—",
                item.hp || "—",
                item.mana || "—",
                item.damage || "—",
                item.delay || "—",
                item.id
              ])}
            />
            <PaginationControls
              currentPage={visiblePage}
              totalPages={totalPages}
              totalItems={items.length}
              pageSize={itemResultsPerPage}
              onPageChange={setPage}
            />
          </>
        ) : showResults ? (
          isFetching ? (
            <ClassLoadingIndicator detail="Summoning item records from the archive." message="Loading matching items..." />
          ) : awaitingManualSubmit ? (
            <SearchPrompt
              message={
                hasShortQuery
                  ? `Type ${itemSearchAutoQueryMinLength}+ characters to auto-search, or press Search to run now.`
                  : "Press Search to apply these filters."
              }
            />
          ) : (
            <SearchPrompt message="No items matched this search." />
          )
        ) : (
          <SearchPrompt message="Enter an item name to load results." />
        )}

        {resolvedTiming ? <p className="pt-1 text-right text-[11px] uppercase tracking-[0.16em] text-[#9f8e79]">{resolvedTiming}</p> : null}
      </SectionCard>
    </>
  );
}
