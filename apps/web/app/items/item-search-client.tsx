"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ItemSummary } from "@eq-alla/data";
import { itemClassFilterOptions, itemRaceFilterOptions, itemSlotFilterOptions } from "@eq-alla/data/item-search-filters";
import { itemTypeFilterOptions } from "@eq-alla/data/item-types";
import { Input, rowLinkClass } from "@eq-alla/ui";
import { Gauge, Gem, MapPin, Shield, Shirt } from "lucide-react";
import { PaginationControls, SearchPrompt, SectionCard, SimpleTable, TableSkeleton } from "../../components/catalog-shell";
import { ClassLoadingIndicator } from "../../components/class-loading-indicator";
import { SearchErrorNotice } from "../../components/search-error-notice";
import {
  FilterField,
  FilterGroup,
  FilterSelect,
  FilterWorkbench,
  MultiSelectDropdown,
  NumberFilter,
  PrimarySearchField,
  SegmentedFilter,
  type AppliedFilter
} from "../../components/search-filter-workbench";
import { waitForLoadingIndicator } from "../../components/loading-state";
import { ItemIcon } from "../../components/item-icon";
import { useTableSort, type TableSortColumn } from "../../components/table-sorting";
import { useUrlPageState } from "../../components/url-list-state";

type ItemSearchFilters = {
  q: string;
  classNames: string[];
  races: string[];
  slots: string[];
  type: string;
  source: string;
  tradeable: string;
  minLevel: string;
  maxLevel: string;
  minAc: string;
  minHp: string;
  minMana: string;
  minDamage: string;
  maxDelay: string;
  minStr: string; minSta: string; minAgi: string; minDex: string; minInt: string; minWis: string; minCha: string;
  minMr: string; minFr: string; minCr: string; minDr: string; minPr: string; minCorruption: string;
  minAttack: string; minHaste: string; minAccuracy: string; minSpellDamage: string; minHealAmount: string;
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

const itemTableColumns: TableSortColumn<ItemSummary>[] = [
  { label: "Icon", getSortValue: (item) => Number(item.icon) || null },
  { label: "Item", getSortValue: (item) => item.name },
  { label: "Type", getSortValue: (item) => item.type },
  { label: "AC", getSortValue: (item) => item.ac || null },
  { label: "HP", getSortValue: (item) => item.hp || null },
  { label: "Mana", getSortValue: (item) => item.mana || null },
  { label: "Damage", getSortValue: (item) => item.damage || null },
  { label: "Delay", getSortValue: (item) => item.delay || null },
  { label: "Item ID", getSortValue: (item) => item.id }
];

const itemTableColumnLabels = itemTableColumns.map((column) => column.label);

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
const itemSearchRequestTimeoutMs = 20_000;
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
  for (const race of filters.races) {
    params.append("race", race);
  }
  for (const slot of filters.slots) {
    params.append("slot", slot);
  }
  if (filters.type) params.set("type", filters.type);
  if (filters.source.trim()) params.set("source", filters.source.trim());
  if (filters.tradeable) params.set("tradeable", filters.tradeable);
  if (filters.minLevel) params.set("minLevel", filters.minLevel);
  if (filters.maxLevel) params.set("maxLevel", filters.maxLevel);
  if (filters.minAc) params.set("minAc", filters.minAc);
  if (filters.minHp) params.set("minHp", filters.minHp);
  if (filters.minMana) params.set("minMana", filters.minMana);
  if (filters.minDamage) params.set("minDamage", filters.minDamage);
  if (filters.maxDelay) params.set("maxDelay", filters.maxDelay);
  for (const key of ["minStr", "minSta", "minAgi", "minDex", "minInt", "minWis", "minCha", "minMr", "minFr", "minCr", "minDr", "minPr", "minCorruption", "minAttack", "minHaste", "minAccuracy", "minSpellDamage", "minHealAmount"] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }

  return params;
}

function hasActiveFilters(filters: ItemSearchFilters) {
  return (
    filters.q.trim().length > 0 ||
    filters.classNames.length > 0 ||
    filters.races.length > 0 ||
    filters.slots.length > 0 ||
    filters.type.length > 0 ||
    filters.source.trim().length > 0 ||
    filters.tradeable.length > 0 ||
    filters.minLevel.length > 0 ||
    filters.maxLevel.length > 0 ||
    filters.minAc.length > 0 ||
    filters.minHp.length > 0 ||
    filters.minMana.length > 0 ||
    filters.minDamage.length > 0 ||
    filters.maxDelay.length > 0 ||
    [filters.minStr, filters.minSta, filters.minAgi, filters.minDex, filters.minInt, filters.minWis, filters.minCha, filters.minMr, filters.minFr, filters.minCr, filters.minDr, filters.minPr, filters.minCorruption, filters.minAttack, filters.minHaste, filters.minAccuracy, filters.minSpellDamage, filters.minHealAmount].some(Boolean)
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

export function ItemSearchClient({ initialFilters, initialItems, initialResultsResolved, frameClassName }: ItemSearchClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [displayKey, setDisplayKey] = useState(initialResultsResolved ? buildSearchParams(initialFilters).toString() : "");
  const [resolutionMeta, setResolutionMeta] = useState<SearchResolutionMeta | null>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    const { q: _query, ...advancedFilters } = initialFilters;
    return hasActiveFilters({ ...advancedFilters, q: "" });
  });
  const { page, setPage, resetPage, clampPage } = useUrlPageState(displayKey);
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
    if (hasActiveFilters({ ...initialFilters, q: "" })) {
      setFiltersExpanded(true);
    }
    currentUrlKeyRef.current = nextKey;
    abortRef.current?.abort();

    if (!nextKey) {
      setItems([]);
      setError(null);
      setDisplayKey("");
      setIsFetching(false);
      setResolutionMeta(null);
      resetPage();
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
      resetPage();
      return;
    }

    setItems([]);
    setError(null);
    setDisplayKey("");
    setIsFetching(false);
    setResolutionMeta(null);
    resetPage();
    setSubmitCount((current) => current + 1);
  }, [initialFilters, initialItems, initialResultsResolved]);

  const setFilter = <K extends keyof ItemSearchFilters>(key: K, value: ItemSearchFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const submitSearch = () => {
    if (!hasActiveFilters(filters)) {
      return;
    }

    const nextKey = buildSearchParams(filters).toString();
    const nextHref = nextKey ? `${pathname}?${nextKey}` : pathname;

    if (nextKey !== currentUrlKeyRef.current) {
      currentUrlKeyRef.current = nextKey;
      router.replace(nextHref, { scroll: false });
      return;
    }

    setSubmitCount((current) => current + 1);
  };

  const clearFilters = () => {
    abortRef.current?.abort();
    setFilters({
      q: "",
      classNames: [],
      races: [],
      slots: [],
      type: "",
      source: "",
      tradeable: "",
      minLevel: "",
      maxLevel: "",
      minAc: "",
      minHp: "",
      minMana: "",
      minDamage: "",
      maxDelay: "",
      minStr: "", minSta: "", minAgi: "", minDex: "", minInt: "", minWis: "", minCha: "",
      minMr: "", minFr: "", minCr: "", minDr: "", minPr: "", minCorruption: "",
      minAttack: "", minHaste: "", minAccuracy: "", minSpellDamage: "", minHealAmount: ""
    });
    setItems([]);
    setError(null);
    setDisplayKey("");
    setIsFetching(false);
    setResolutionMeta(null);
    resetPage();
    currentUrlKeyRef.current = "";
    router.replace(pathname, { scroll: false });
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
    }

    abortRef.current?.abort();

    if (!hasActiveFilters(filters)) {
      setItems([]);
      setError(null);
      setDisplayKey("");
      setIsFetching(false);
      setResolutionMeta(null);
      resetPage();
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
    let timedOut = false;
    const requestTimeoutId =
      typeof window === "undefined"
        ? null
        : window.setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, itemSearchRequestTimeoutMs);

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
        if (controller.signal.aborted && !timedOut) {
          return;
        }

        console.error(searchError);
        setError(
          timedOut
            ? "Item search timed out on the deployment. Showing the last successful search."
            : "Could not refresh item results. Showing the last successful search."
        );
      } finally {
        if (requestTimeoutId !== null) {
          window.clearTimeout(requestTimeoutId);
        }

        if (abortRef.current === controller) {
          abortRef.current = null;
          await waitForLoadingIndicator(startedAt);
          setIsFetching(false);
        }
      }
    })();
  }, [filters, pathname, submitCount]);

  const { sortedRows: sortedItems, sort: tableSort } = useTableSort(items, itemTableColumns, {
    urlParam: "sort",
    onSortChange: () => setPage(1)
  });
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / itemResultsPerPage));
  const visiblePage = Math.min(page, totalPages);
  const pagedItems = sortedItems.slice((visiblePage - 1) * itemResultsPerPage, visiblePage * itemResultsPerPage);
  const draftKey = buildSearchParams(filters).toString();
  const showResults = hasActiveFilters(filters) || isFetching || displayKey.length > 0;
  const resultTitle = showResults
    ? isFetching && items.length === 0
      ? "Loading items"
      : `${items.length} matching ${items.length === 1 ? "item" : "items"}`
    : "Results";
  const statusLabel = isFetching ? "Refreshing results..." : draftKey === displayKey && displayKey ? "Filters applied" : "Press Search to apply filters";
  const resolvedTiming =
    resolutionMeta && resolutionMeta.key === displayKey && !isFetching
      ? `Loaded in ${formatDuration(resolutionMeta.durationMs)}${resolutionMeta.source === "cache" ? " from cache" : ""}`
      : null;
  const removeArrayFilter = (key: "classNames" | "races" | "slots", value: string) => {
    setFilter(key, filters[key].filter((entry) => entry !== value));
  };
  const appliedFilters: AppliedFilter[] = [
    ...(filters.q.trim()
      ? [{ key: "q", label: `Name or ID: ${filters.q.trim()}`, onRemove: () => setFilter("q", "") }]
      : []),
    ...filters.classNames.map((value) => ({
      key: `class-${value}`,
      label: `Class: ${value}`,
      onRemove: () => removeArrayFilter("classNames", value)
    })),
    ...filters.races.map((value) => ({
      key: `race-${value}`,
      label: `Race: ${value}`,
      onRemove: () => removeArrayFilter("races", value)
    })),
    ...filters.slots.map((value) => ({
      key: `slot-${value}`,
      label: `Slot: ${value}`,
      onRemove: () => removeArrayFilter("slots", value)
    })),
    ...(filters.type ? [{ key: "type", label: `Type: ${filters.type}`, onRemove: () => setFilter("type", "") }] : []),
    ...(filters.source.trim()
      ? [{ key: "source", label: `Source: ${filters.source.trim()}`, onRemove: () => setFilter("source", "") }]
      : []),
    ...(filters.tradeable
      ? [
          {
            key: "tradeable",
            label: filters.tradeable === "true" ? "Tradeable" : "No-drop",
            onRemove: () => setFilter("tradeable", "")
          }
        ]
      : []),
    ...(filters.minLevel ? [{ key: "minLevel", label: `Level ≥ ${filters.minLevel}`, onRemove: () => setFilter("minLevel", "") }] : []),
    ...(filters.maxLevel ? [{ key: "maxLevel", label: `Level ≤ ${filters.maxLevel}`, onRemove: () => setFilter("maxLevel", "") }] : []),
    ...(filters.minAc ? [{ key: "minAc", label: `AC ≥ ${filters.minAc}`, onRemove: () => setFilter("minAc", "") }] : []),
    ...(filters.minHp ? [{ key: "minHp", label: `HP ≥ ${filters.minHp}`, onRemove: () => setFilter("minHp", "") }] : []),
    ...(filters.minMana ? [{ key: "minMana", label: `Mana ≥ ${filters.minMana}`, onRemove: () => setFilter("minMana", "") }] : []),
    ...(filters.minDamage
      ? [{ key: "minDamage", label: `Damage ≥ ${filters.minDamage}`, onRemove: () => setFilter("minDamage", "") }]
      : []),
    ...(filters.maxDelay ? [{ key: "maxDelay", label: `Delay ≤ ${filters.maxDelay}`, onRemove: () => setFilter("maxDelay", "") }] : []),
    ...([
      ["minStr", "STR"], ["minSta", "STA"], ["minAgi", "AGI"], ["minDex", "DEX"], ["minInt", "INT"], ["minWis", "WIS"], ["minCha", "CHA"],
      ["minMr", "MR"], ["minFr", "FR"], ["minCr", "CR"], ["minDr", "DR"], ["minPr", "PR"], ["minCorruption", "Corruption"],
      ["minAttack", "Attack"], ["minHaste", "Haste"], ["minAccuracy", "Accuracy"], ["minSpellDamage", "Spell damage"], ["minHealAmount", "Heal amount"]
    ] as const).flatMap(([key, label]) =>
      filters[key] ? [{ key, label: `${label} ≥ ${filters[key]}`, onRemove: () => setFilter(key, "") }] : []
    )
  ];
  const advancedFilterCount = Math.max(0, appliedFilters.length - (filters.q.trim() ? 1 : 0));

  useEffect(() => {
    clampPage(totalPages);
  }, [clampPage, totalPages]);

  return (
    <>
      <FilterWorkbench
        title="Find the right item"
        description="Search first, then narrow by equipability, requirements, source, and stats."
        status={statusLabel}
        activeCount={advancedFilterCount}
        expanded={filtersExpanded}
        onExpandedChange={setFiltersExpanded}
        onSearch={submitSearch}
        onClear={clearFilters}
        className={frameClassName}
        appliedFilters={appliedFilters}
        primary={
          <PrimarySearchField
            label="Item name or ID"
            name="q"
            value={filters.q}
            onChange={(value) => setFilter("q", value)}
            placeholder="e.g. Runed Mithril or 1001"
          />
        }
      >
        <div className="grid gap-5 xl:grid-cols-2">
          <FilterGroup
            title="Equipability"
            description="Match the characters and equipment slots that can use the item."
            icon={<Shirt className="size-4" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <MultiSelectDropdown
                label="Class"
                name="class"
                values={filters.classNames}
                onChange={(values) => setFilter("classNames", values)}
                options={[...itemClassFilterOptions]}
              />
              <MultiSelectDropdown
                label="Playable race"
                name="race"
                values={filters.races}
                onChange={(values) => setFilter("races", values)}
                options={[...itemRaceFilterOptions]}
              />
              <MultiSelectDropdown
                label="Slot"
                name="slot"
                values={filters.slots}
                onChange={(values) => setFilter("slots", values)}
                options={[...itemSlotFilterOptions, "Inventory"]}
              />
              <FilterSelect
                label="Item type"
                name="type"
                value={filters.type}
                onChange={(value) => setFilter("type", value)}
                options={[...itemTypeFilterOptions]}
              />
            </div>
          </FilterGroup>

          <FilterGroup
            title="Requirements & source"
            description="Limit required level, trade rules, or the source label stored with the item."
            icon={<MapPin className="size-4" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberFilter label="Minimum required level" name="minLevel" value={filters.minLevel} onChange={(value) => setFilter("minLevel", value)} placeholder="1" min={1} />
              <NumberFilter label="Maximum required level" name="maxLevel" value={filters.maxLevel} onChange={(value) => setFilter("maxLevel", value)} placeholder="65" min={1} />
              <SegmentedFilter
                label="Trade rules"
                value={filters.tradeable}
                onChange={(value) => setFilter("tradeable", value)}
                options={[
                  { value: "", label: "Any" },
                  { value: "true", label: "Tradeable" },
                  { value: "false", label: "No-drop" }
                ]}
              />
              <FilterField label="Source contains" hint="Optional">
                <Input
                  name="source"
                  value={filters.source}
                  onChange={(event) => setFilter("source", event.target.value)}
                  placeholder="Zone or source label"
                />
              </FilterField>
            </div>
          </FilterGroup>

          <FilterGroup
            title="Defensive stats"
            description="Set minimum survivability values; leave a field empty to ignore it."
            icon={<Shield className="size-4" />}
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <NumberFilter label="Minimum AC" name="minAc" value={filters.minAc} onChange={(value) => setFilter("minAc", value)} placeholder="0" />
              <NumberFilter label="Minimum HP" name="minHp" value={filters.minHp} onChange={(value) => setFilter("minHp", value)} placeholder="0" />
              <NumberFilter label="Minimum mana" name="minMana" value={filters.minMana} onChange={(value) => setFilter("minMana", value)} placeholder="0" />
            </div>
          </FilterGroup>

          <FilterGroup
            title="Attributes & resists"
            description="Set a floor for the core character stats or the resistance line you need."
            icon={<Shield className="size-4" />}
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <NumberFilter label="Minimum STR" name="minStr" value={filters.minStr} onChange={(value) => setFilter("minStr", value)} placeholder="0" />
              <NumberFilter label="Minimum STA" name="minSta" value={filters.minSta} onChange={(value) => setFilter("minSta", value)} placeholder="0" />
              <NumberFilter label="Minimum AGI" name="minAgi" value={filters.minAgi} onChange={(value) => setFilter("minAgi", value)} placeholder="0" />
              <NumberFilter label="Minimum DEX" name="minDex" value={filters.minDex} onChange={(value) => setFilter("minDex", value)} placeholder="0" />
              <NumberFilter label="Minimum INT" name="minInt" value={filters.minInt} onChange={(value) => setFilter("minInt", value)} placeholder="0" />
              <NumberFilter label="Minimum WIS" name="minWis" value={filters.minWis} onChange={(value) => setFilter("minWis", value)} placeholder="0" />
              <NumberFilter label="Minimum CHA" name="minCha" value={filters.minCha} onChange={(value) => setFilter("minCha", value)} placeholder="0" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <NumberFilter label="Minimum MR" name="minMr" value={filters.minMr} onChange={(value) => setFilter("minMr", value)} placeholder="0" />
              <NumberFilter label="Minimum FR" name="minFr" value={filters.minFr} onChange={(value) => setFilter("minFr", value)} placeholder="0" />
              <NumberFilter label="Minimum CR" name="minCr" value={filters.minCr} onChange={(value) => setFilter("minCr", value)} placeholder="0" />
              <NumberFilter label="Minimum DR" name="minDr" value={filters.minDr} onChange={(value) => setFilter("minDr", value)} placeholder="0" />
              <NumberFilter label="Minimum PR" name="minPr" value={filters.minPr} onChange={(value) => setFilter("minPr", value)} placeholder="0" />
              <NumberFilter label="Minimum corruption" name="minCorruption" value={filters.minCorruption} onChange={(value) => setFilter("minCorruption", value)} placeholder="0" />
            </div>
          </FilterGroup>

          <FilterGroup
            title="Weapon profile"
            description="Find weapons that meet a damage floor and speed ceiling."
            icon={<Gauge className="size-4" />}
          >
            <div className="grid grid-cols-2 gap-4">
              <NumberFilter label="Minimum damage" name="minDamage" value={filters.minDamage} onChange={(value) => setFilter("minDamage", value)} placeholder="0" />
              <NumberFilter label="Maximum delay" name="maxDelay" value={filters.maxDelay} onChange={(value) => setFilter("maxDelay", value)} placeholder="40" />
            </div>
            <p className="mt-3 flex items-center gap-2 text-[11px] leading-5 text-[#8f836f]">
              <Gem className="size-3.5 text-[#b89869]" />
              Combine both values to quickly isolate efficient weapon candidates.
            </p>
          </FilterGroup>

          <FilterGroup
            title="Combat & spell modifiers"
            description="Narrow for offensive stats and caster-friendly item bonuses."
            icon={<Gauge className="size-4" />}
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <NumberFilter label="Minimum attack" name="minAttack" value={filters.minAttack} onChange={(value) => setFilter("minAttack", value)} placeholder="0" />
              <NumberFilter label="Minimum haste" name="minHaste" value={filters.minHaste} onChange={(value) => setFilter("minHaste", value)} placeholder="0" />
              <NumberFilter label="Minimum accuracy" name="minAccuracy" value={filters.minAccuracy} onChange={(value) => setFilter("minAccuracy", value)} placeholder="0" />
              <NumberFilter label="Minimum spell damage" name="minSpellDamage" value={filters.minSpellDamage} onChange={(value) => setFilter("minSpellDamage", value)} placeholder="0" />
              <NumberFilter label="Minimum heal amount" name="minHealAmount" value={filters.minHealAmount} onChange={(value) => setFilter("minHealAmount", value)} placeholder="0" />
            </div>
          </FilterGroup>
        </div>
      </FilterWorkbench>

      {error ? (
        <SearchErrorNotice
          message={error}
          onRetry={() => setSubmitCount((current) => current + 1)}
          isRetrying={isFetching}
        />
      ) : null}

      <SectionCard title={resultTitle} announceTitle className={`relative z-0 ${frameClassName}`.trim()}>
        <div className="relative">
          {showResults && items.length > 0 ? (
            <div className={isFetching ? "transition duration-200 opacity-40 blur-[2px]" : undefined}>
              <SimpleTable
                columns={itemTableColumnLabels}
                stickyColumnIndex={1}
                sort={tableSort}
                rowKeys={pagedItems.map((item) => item.id)}
                rows={pagedItems.map((item) => [
                  <ItemIcon key={`${item.id}-icon`} icon={item.icon} name={item.name} size="sm" tooltipItemId={item.id} />,
                  <Link
                    key={item.id}
                    href={`/items/${item.id}`}
                    className={rowLinkClass}
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
              <TableSkeleton columnCount={9} />
            ) : draftKey !== displayKey ? (
              <SearchPrompt message="Press Search to apply these filters." />
            ) : (
              <SearchPrompt
                message="No items matched this search."
                hint="Try a shorter name, widen the level range, or drop a class or slot filter."
                action={{ label: "Clear filters", onClick: clearFilters }}
              />
            )
          ) : (
            <SearchPrompt
              message="Enter an item name or ID to load results."
              hint="Partial names work - try &quot;mithril&quot;, &quot;cloak of&quot;, or an item ID."
            />
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
