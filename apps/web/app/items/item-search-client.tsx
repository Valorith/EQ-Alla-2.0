"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { ItemSummary } from "@eq-alla/data";
import { itemClassFilterOptions, itemSlotFilterOptions } from "@eq-alla/data/item-search-filters";
import { itemTypeFilterOptions } from "@eq-alla/data/item-types";
import { Button, Input } from "@eq-alla/ui";
import { PaginationControls, SearchPrompt, SectionCard, SimpleTable } from "../../components/catalog-shell";
import { ClassLoadingIndicator } from "../../components/class-loading-indicator";
import { waitForLoadingIndicator } from "../../components/loading-state";
import { ItemIcon } from "../../components/item-icon";

type ItemSearchFilters = {
  q: string;
  classNames: string[];
  slots: string[];
  type: string;
  minLevel: string;
  maxLevel: string;
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

  for (const className of filters.classNames) {
    params.append("class", className);
  }
  for (const slot of filters.slots) {
    params.append("slot", slot);
  }
  if (filters.type) params.set("type", filters.type);
  if (filters.minLevel) params.set("minLevel", filters.minLevel);
  if (filters.maxLevel) params.set("maxLevel", filters.maxLevel);

  return params;
}

function hasActiveFilters(filters: ItemSearchFilters) {
  return (
    filters.q.trim().length > 0 ||
    filters.classNames.length > 0 ||
    filters.slots.length > 0 ||
    filters.type.length > 0 ||
    filters.minLevel.length > 0 ||
    filters.maxLevel.length > 0
  );
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

function formatMultiSelectSummary(values: string[]) {
  if (values.length === 0) {
    return "Any";
  }

  if (values.length <= 2) {
    return values.join(", ");
  }

  return `${values.length} selected`;
}

function MultiSelectDropdown({
  label,
  name,
  values,
  options,
  onChange
}: {
  label: string;
  name: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const summary = formatMultiSelectSummary(values);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleValue = (option: string) => {
    onChange(values.includes(option) ? values.filter((value) => value !== option) : [...values, option]);
  };

  return (
    <div ref={containerRef} className="relative grid gap-2 text-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{label}</span>
      <button
        type="button"
        name={name}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-[var(--border-strong)] bg-[var(--panel)] px-4 text-left text-sm text-[var(--foreground)] outline-none transition hover:border-[color:rgba(215,164,95,0.38)] focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_rgba(215,164,95,0.12)]"
      >
        <span className={values.length === 0 ? "text-[var(--muted)]" : ""}>{summary}</span>
        <span className="text-xs text-[var(--muted)]">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen ? (
        <div className="absolute top-full z-30 mt-2 w-full overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--panel)] shadow-[0_18px_44px_rgba(0,0,0,0.3)] backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
            <span>{values.length === 0 ? "Any" : `${values.length} selected`}</span>
            {values.length > 0 ? (
              <button
                type="button"
                className="font-semibold text-[#d7a45f] transition hover:text-[#f0c98a]"
                onClick={() => onChange([])}
              >
                Clear
              </button>
            ) : null}
          </div>
          <div role="listbox" aria-multiselectable="true" className="max-h-72 overflow-y-auto py-1">
            {options.map((option) => {
              const checked = values.includes(option);

              return (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-[var(--foreground)] transition hover:bg-white/7"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(option)}
                    className="size-4 rounded border-[var(--border-strong)] bg-transparent text-[#d7a45f] focus:ring-[#c69a5f]"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ItemSearchClient({ initialFilters, initialItems, initialResultsResolved, frameClassName }: ItemSearchClientProps) {
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [displayKey, setDisplayKey] = useState(initialResultsResolved ? buildSearchParams(initialFilters).toString() : "");
  const [resolutionMeta, setResolutionMeta] = useState<SearchResolutionMeta | null>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [page, setPage] = useState(1);
  const abortRef = useRef<AbortController | null>(null);
  const currentUrlKeyRef = useRef(buildSearchParams(initialFilters).toString());
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
    const nextKey = buildSearchParams(initialFilters).toString();

    setFilters(initialFilters);
    currentUrlKeyRef.current = nextKey;
    abortRef.current?.abort();

    if (!nextKey) {
      setItems([]);
      setError(null);
      setDisplayKey("");
      setIsFetching(false);
      setResolutionMeta(null);
      setPage(1);
      return;
    }

    if (initialResultsResolved) {
      setItems(initialItems);
      setError(null);
      setDisplayKey(nextKey);
      setIsFetching(false);
      setResolutionMeta({
        key: nextKey,
        durationMs: 0,
        source: "cache"
      });
      setPage(1);
      return;
    }

    setItems([]);
    setError(null);
    setDisplayKey("");
    setIsFetching(false);
    setResolutionMeta(null);
    setPage(1);
    setSubmitCount((current) => current + 1);
  }, [initialFilters, initialItems, initialResultsResolved]);

  const setFilter = <K extends keyof ItemSearchFilters>(key: K, value: ItemSearchFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const submitSearch = () => {
    if (!hasActiveFilters(filters)) {
      return;
    }

    setSubmitCount((current) => current + 1);
  };

  const clearFilters = () => {
    abortRef.current?.abort();
    setFilters({
      q: "",
      classNames: [],
      slots: [],
      type: "",
      minLevel: "",
      maxLevel: ""
    });
    setItems([]);
    setError(null);
    setDisplayKey("");
    setIsFetching(false);
    setResolutionMeta(null);
    setPage(1);
    currentUrlKeyRef.current = "";
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", pathname);
    }
  };

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (submitCount === 0 || submitCount === lastHandledSubmitRef.current) {
      return;
    }

    lastHandledSubmitRef.current = submitCount;
    const nextKey = buildSearchParams(filters).toString();
    const nextHref = nextKey ? `${pathname}?${nextKey}` : pathname;

    if (nextKey !== currentUrlKeyRef.current) {
      currentUrlKeyRef.current = nextKey;
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", nextHref);
      }
    }

    abortRef.current?.abort();

    if (!hasActiveFilters(filters)) {
      setItems([]);
      setError(null);
      setDisplayKey("");
      setIsFetching(false);
      setResolutionMeta(null);
      setPage(1);
      return;
    }

    const startedAt = performance.now();
    setIsFetching(true);
    setError(null);

    const cachedItems = getClientCachedItems(nextKey);
    if (cachedItems) {
      void (async () => {
        await waitForLoadingIndicator(startedAt);
        setItems(cachedItems);
        setDisplayKey(nextKey);
        setError(null);
        setIsFetching(false);
        setResolutionMeta({
          key: nextKey,
          durationMs: performance.now() - startedAt,
          source: "cache"
        });
      })();
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

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
          await waitForLoadingIndicator(startedAt);
          setIsFetching(false);
        }
      }
    })();
  }, [filters, pathname, submitCount]);

  const totalPages = Math.max(1, Math.ceil(items.length / itemResultsPerPage));
  const visiblePage = Math.min(page, totalPages);
  const pagedItems = items.slice((visiblePage - 1) * itemResultsPerPage, visiblePage * itemResultsPerPage);
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
        className={`relative z-20 ${frameClassName}`.trim()}
        allowOverflow
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
          <MultiSelectDropdown
            label="Class"
            name="class"
            values={filters.classNames}
            onChange={(values) => setFilter("classNames", values)}
            options={[...itemClassFilterOptions]}
          />
          <MultiSelectDropdown
            label="Slot"
            name="slot"
            values={filters.slots}
            onChange={(values) => setFilter("slots", values)}
            options={[...itemSlotFilterOptions, "Inventory"]}
          />
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

      <SectionCard title={resultTitle} className={`relative z-0 ${frameClassName}`.trim()}>
        <div className="relative">
          {showResults && items.length > 0 ? (
            <div className={isFetching ? "transition duration-200 opacity-40 blur-[2px]" : undefined}>
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
            </div>
          ) : showResults ? (
            isFetching ? (
              <ClassLoadingIndicator detail="Summoning item records from the archive." message="Loading matching items..." />
            ) : draftKey !== displayKey ? (
              <SearchPrompt message="Press Search to apply these filters." />
            ) : (
              <SearchPrompt message="No items matched this search." />
            )
          ) : (
            <SearchPrompt message="Enter an item name to load results." />
          )}

          {isFetching && items.length > 0 ? (
            <ClassLoadingIndicator overlay detail="Summoning item records from the archive." message="Loading matching items..." />
          ) : null}
        </div>

        {resolvedTiming ? <p className="pt-1 text-right text-[11px] uppercase tracking-[0.16em] text-[#9f8e79]">{resolvedTiming}</p> : null}
      </SectionCard>
    </>
  );
}
