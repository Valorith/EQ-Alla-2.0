"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { NpcSummary } from "@eq-alla/data";
import { bodyTypeNames } from "@eq-alla/data/body-type-names";
import { itemClassFilterOptions } from "@eq-alla/data/item-search-filters";
import { Input, rowLinkClass } from "@eq-alla/ui";
import { Activity, MapPin, Swords, Users } from "lucide-react";
import { ClassLoadingIndicator } from "../../components/class-loading-indicator";
import { PaginationControls, SearchPrompt, SectionCard, SimpleTable, TableSkeleton } from "../../components/catalog-shell";
import { SearchErrorNotice } from "../../components/search-error-notice";
import {
  FilterField,
  FilterGroup,
  FilterSelect,
  FilterWorkbench,
  NumberFilter,
  PrimarySearchField,
  SegmentedFilter,
  type AppliedFilter
} from "../../components/search-filter-workbench";
import { waitForLoadingIndicator } from "../../components/loading-state";
import { getLeadingSortNumber, useTableSort, type TableSortColumn } from "../../components/table-sorting";
import { useUrlPageState } from "../../components/url-list-state";

type NpcSearchClientProps = {
  mode: "basic" | "advanced";
  initialFilters: {
    q: string;
    zone: string;
    race: string;
    className: string;
    bodyType: string;
    minLevel: string;
    maxLevel: string;
    minHp: string;
    maxHp: string;
    named: string;
    merchant: string;
  };
};

type NpcFilters = {
  q: string;
  zone: string;
  race: string;
  className: string;
  bodyType: string;
  minLevel: string;
  maxLevel: string;
  minHp: string;
  maxHp: string;
  named: string;
  merchant: string;
};

type SearchResolutionMeta = {
  key: string;
  durationMs: number;
  source: "network" | "cache";
};

type NpcCacheEntry = {
  expiresAt: number;
  results: NpcSummary[];
  touchedAt: number;
};

const npcTableColumns: TableSortColumn<NpcSummary>[] = [
  { label: "Name", getSortValue: (npc) => npc.name },
  { label: "Level", getSortValue: (npc) => getLeadingSortNumber(npc.level) },
  { label: "Race", getSortValue: (npc) => npc.race },
  { label: "Class", getSortValue: (npc) => npc.klass },
  { label: "Zone", getSortValue: (npc) => npc.zone },
  { label: "HP", getSortValue: (npc) => npc.hp ?? null },
  { label: "Kind", getSortValue: (npc) => (npc.merchant ? "Merchant" : npc.named ? "Named" : "Common") },
  { label: "NPC ID", getSortValue: (npc) => npc.id }
];
const npcTableColumnLabels = npcTableColumns.map((column) => column.label);
const npcClassOptions = [...itemClassFilterOptions, "Merchant"];
const npcBodyTypeOptions = [...new Set(Object.values(bodyTypeNames))].sort((left, right) => left.localeCompare(right));

const npcResultsPerPage = 25;
const npcSearchCacheTtlMs = 180_000;
const npcSearchCacheMaxEntries = 12;
const npcSearchSessionStorageKey = "eq-npc-search-cache";

const npcResultCache = new Map<string, NpcCacheEntry>();
let npcCacheHydrated = false;

function buildSearchParams(filters: NpcFilters, mode: "basic" | "advanced") {
  const params = new URLSearchParams();
  const query = filters.q.trim();
  if (query) params.set(mode === "advanced" ? "name" : "q", query);
  if (filters.zone.trim()) params.set("zone", filters.zone.trim());
  if (filters.race.trim()) params.set("race", filters.race.trim());
  if (filters.className) params.set("class", filters.className);
  if (filters.bodyType) params.set("bodyType", filters.bodyType);
  if (filters.minLevel) params.set("minLevel", filters.minLevel);
  if (filters.maxLevel) params.set("maxLevel", filters.maxLevel);
  if (filters.minHp) params.set("minHp", filters.minHp);
  if (filters.maxHp) params.set("maxHp", filters.maxHp);
  if (filters.named) params.set("named", filters.named);
  if (filters.merchant) params.set("merchant", filters.merchant);
  return params;
}

function hasActiveFilters(filters: NpcFilters) {
  return (
    filters.q.trim().length > 0 ||
    filters.zone.trim().length > 0 ||
    filters.race.trim().length > 0 ||
    filters.className.length > 0 ||
    filters.bodyType.length > 0 ||
    filters.minLevel.length > 0 ||
    filters.maxLevel.length > 0 ||
    filters.minHp.length > 0 ||
    filters.maxHp.length > 0 ||
    filters.named.length > 0 ||
    filters.merchant.length > 0
  );
}

function formatDuration(durationMs: number) {
  if (durationMs < 1_000) return `${Math.max(1, Math.round(durationMs))}ms`;
  return `${(durationMs / 1_000).toFixed(durationMs >= 10_000 ? 1 : 2)}s`;
}

function persistNpcCache() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(npcSearchSessionStorageKey, JSON.stringify(Object.fromEntries(npcResultCache.entries())));
  } catch {}
}

function pruneNpcCache(now = Date.now()) {
  for (const [key, entry] of npcResultCache.entries()) {
    if (entry.expiresAt < now) npcResultCache.delete(key);
  }
  if (npcResultCache.size <= npcSearchCacheMaxEntries) return;
  const oldest = [...npcResultCache.entries()]
    .sort((left, right) => left[1].touchedAt - right[1].touchedAt)
    .slice(0, npcResultCache.size - npcSearchCacheMaxEntries);
  for (const [key] of oldest) npcResultCache.delete(key);
}

function hydrateNpcCache() {
  if (npcCacheHydrated || typeof window === "undefined") return;
  npcCacheHydrated = true;
  const payload = window.sessionStorage.getItem(npcSearchSessionStorageKey);
  if (!payload) return;
  try {
    const parsed = JSON.parse(payload) as Record<string, NpcCacheEntry>;
    const now = Date.now();
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry && Array.isArray(entry.results) && typeof entry.expiresAt === "number") {
        npcResultCache.set(key, {
          expiresAt: entry.expiresAt,
          results: entry.results,
          touchedAt: typeof entry.touchedAt === "number" ? entry.touchedAt : now
        });
      }
    }
    pruneNpcCache(now);
    persistNpcCache();
  } catch {
    window.sessionStorage.removeItem(npcSearchSessionStorageKey);
  }
}

function getCachedNpcs(key: string) {
  hydrateNpcCache();
  const entry = npcResultCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    npcResultCache.delete(key);
    persistNpcCache();
    return null;
  }
  entry.touchedAt = Date.now();
  return entry.results;
}

function setCachedNpcs(key: string, results: NpcSummary[]) {
  hydrateNpcCache();
  npcResultCache.set(key, {
    expiresAt: Date.now() + npcSearchCacheTtlMs,
    results,
    touchedAt: Date.now()
  });
  pruneNpcCache();
  persistNpcCache();
}

export function NpcSearchClient({ mode, initialFilters }: NpcSearchClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [filters, setFilters] = useState<NpcFilters>(initialFilters);
  const [results, setResults] = useState<NpcSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [displayKey, setDisplayKey] = useState("");
  const [resolutionMeta, setResolutionMeta] = useState<SearchResolutionMeta | null>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [filtersExpanded, setFiltersExpanded] = useState(() => hasActiveFilters({ ...initialFilters, q: "" }));
  const { page, setPage, resetPage, clampPage } = useUrlPageState(displayKey);
  const abortRef = useRef<AbortController | null>(null);
  const currentUrlKeyRef = useRef(buildSearchParams(initialFilters, mode).toString());
  const lastHandledSubmitRef = useRef(0);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const nextKey = buildSearchParams(initialFilters, mode).toString();

    setFilters(initialFilters);
    if (hasActiveFilters({ ...initialFilters, q: "" })) {
      setFiltersExpanded(true);
    }
    currentUrlKeyRef.current = nextKey;
    abortRef.current?.abort();

    if (!nextKey) {
      setResults([]);
      setError(null);
      setDisplayKey("");
      setIsFetching(false);
      setResolutionMeta(null);
      resetPage();
      return;
    }

    setResults([]);
    setError(null);
    setDisplayKey("");
    setIsFetching(false);
    setResolutionMeta(null);
    resetPage();
    setSubmitCount((current) => current + 1);
  }, [initialFilters, mode]);

  const setFilter = (key: keyof NpcFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const submitSearch = () => {
    if (!hasActiveFilters(filters)) return;

    const nextKey = buildSearchParams(filters, mode).toString();
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
      zone: "",
      race: "",
      className: "",
      bodyType: "",
      minLevel: "",
      maxLevel: "",
      minHp: "",
      maxHp: "",
      named: "",
      merchant: ""
    });
    setResults([]);
    setError(null);
    setDisplayKey("");
    setIsFetching(false);
    setResolutionMeta(null);
    resetPage();
    currentUrlKeyRef.current = "";
    router.replace(pathname, { scroll: false });
  };

  useEffect(() => {
    if (submitCount === 0 || submitCount === lastHandledSubmitRef.current) {
      return;
    }

    lastHandledSubmitRef.current = submitCount;
    const nextKey = buildSearchParams(filters, mode).toString();
    const nextHref = nextKey ? `${pathname}?${nextKey}` : pathname;
    if (nextKey !== currentUrlKeyRef.current) {
      currentUrlKeyRef.current = nextKey;
    }

    abortRef.current?.abort();

    if (!hasActiveFilters(filters)) {
      setResults([]);
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

    const cached = getCachedNpcs(nextKey);
    if (cached) {
      void (async () => {
        await waitForLoadingIndicator(startedAt);
        setResults(cached);
        setDisplayKey(nextKey);
        setError(null);
        setIsFetching(false);
        setResolutionMeta({ key: nextKey, durationMs: performance.now() - startedAt, source: "cache" });
      })();
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    void (async () => {
      try {
        const response = await fetch(`/api/npcs?${nextKey}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Search failed with ${response.status}`);
        const payload = (await response.json()) as { data?: NpcSummary[] };
        if (controller.signal.aborted) return;
        setResults(payload.data ?? []);
        setDisplayKey(nextKey);
        setCachedNpcs(nextKey, payload.data ?? []);
        setResolutionMeta({ key: nextKey, durationMs: performance.now() - startedAt, source: "network" });
      } catch (searchError) {
        if (controller.signal.aborted) return;
        console.error(searchError);
        setError("Could not refresh NPC results. Showing the last successful search.");
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          await waitForLoadingIndicator(startedAt);
          setIsFetching(false);
        }
      }
    })();
  }, [filters, mode, pathname, submitCount]);

  const { sortedRows: sortedResults, sort: tableSort } = useTableSort(results, npcTableColumns, {
    urlParam: "sort",
    onSortChange: () => setPage(1)
  });
  const totalPages = Math.max(1, Math.ceil(sortedResults.length / npcResultsPerPage));
  const visiblePage = Math.min(page, totalPages);
  const pagedResults = sortedResults.slice((visiblePage - 1) * npcResultsPerPage, visiblePage * npcResultsPerPage);
  const draftKey = buildSearchParams(filters, mode).toString();
  const showResults = hasActiveFilters(filters) || isFetching || displayKey.length > 0;
  const resultTitle = showResults
    ? isFetching && results.length === 0
      ? "Loading NPCs"
      : `${results.length} matching ${results.length === 1 ? "NPC" : "NPCs"}`
    : "Results";
  const statusLabel = isFetching ? "Refreshing results..." : draftKey === displayKey && displayKey ? "Filters applied" : "Press Search to apply filters";
  const resolvedTiming =
    resolutionMeta && resolutionMeta.key === displayKey && !isFetching
      ? `Loaded in ${formatDuration(resolutionMeta.durationMs)}${resolutionMeta.source === "cache" ? " from cache" : ""}`
      : null;
  const appliedFilters: AppliedFilter[] = [
    ...(filters.q.trim()
      ? [{ key: "q", label: `Name or ID: ${filters.q.trim()}`, onRemove: () => setFilter("q", "") }]
      : []),
    ...(filters.zone.trim() ? [{ key: "zone", label: `Zone: ${filters.zone.trim()}`, onRemove: () => setFilter("zone", "") }] : []),
    ...(filters.race.trim() ? [{ key: "race", label: `Race: ${filters.race.trim()}`, onRemove: () => setFilter("race", "") }] : []),
    ...(filters.className
      ? [{ key: "class", label: `Class: ${filters.className}`, onRemove: () => setFilter("className", "") }]
      : []),
    ...(filters.bodyType
      ? [{ key: "bodyType", label: `Body: ${filters.bodyType}`, onRemove: () => setFilter("bodyType", "") }]
      : []),
    ...(filters.minLevel ? [{ key: "minLevel", label: `Level ≥ ${filters.minLevel}`, onRemove: () => setFilter("minLevel", "") }] : []),
    ...(filters.maxLevel ? [{ key: "maxLevel", label: `Level ≤ ${filters.maxLevel}`, onRemove: () => setFilter("maxLevel", "") }] : []),
    ...(filters.minHp ? [{ key: "minHp", label: `HP ≥ ${filters.minHp}`, onRemove: () => setFilter("minHp", "") }] : []),
    ...(filters.maxHp ? [{ key: "maxHp", label: `HP ≤ ${filters.maxHp}`, onRemove: () => setFilter("maxHp", "") }] : []),
    ...(filters.named
      ? [
          {
            key: "named",
            label: filters.named === "true" ? "Named NPCs" : "Common NPCs",
            onRemove: () => setFilter("named", "")
          }
        ]
      : []),
    ...(filters.merchant
      ? [
          {
            key: "merchant",
            label: filters.merchant === "true" ? "Merchants" : "Non-merchants",
            onRemove: () => setFilter("merchant", "")
          }
        ]
      : [])
  ];
  const advancedFilterCount = Math.max(0, appliedFilters.length - (filters.q.trim() ? 1 : 0));

  useEffect(() => {
    clampPage(totalPages);
  }, [clampPage, totalPages]);

  return (
    <>
      <FilterWorkbench
        title="Search the bestiary"
        description="Start with a name or ID, then narrow by habitat, creature profile, level, and role."
        status={statusLabel}
        activeCount={advancedFilterCount}
        expanded={filtersExpanded}
        onExpandedChange={setFiltersExpanded}
        onSearch={submitSearch}
        onClear={clearFilters}
        appliedFilters={appliedFilters}
        emptyMessage="No filters selected. Add a name or open more filters to browse the bestiary."
        primary={
          <PrimarySearchField
            label="NPC name or ID"
            name={mode === "advanced" ? "name" : "q"}
            value={filters.q}
            onChange={(value) => setFilter("q", value)}
            placeholder="e.g. mistmoore guard or 59000"
          />
        }
      >
        <div className="grid gap-5 xl:grid-cols-2">
          <FilterGroup
            title="Habitat & appearance"
            description="Zone and race accept partial names, so broad searches stay quick to enter."
            icon={<MapPin className="size-4" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FilterField label="Zone contains">
                <Input
                  name="zone"
                  value={filters.zone}
                  onChange={(event) => setFilter("zone", event.target.value)}
                  placeholder="Castle Mistmoore"
                />
              </FilterField>
              <FilterField label="Race contains">
                <Input
                  name="race"
                  value={filters.race}
                  onChange={(event) => setFilter("race", event.target.value)}
                  placeholder="Skeleton, Dragon..."
                />
              </FilterField>
            </div>
          </FilterGroup>

          <FilterGroup
            title="Creature profile"
            description="Filter by combat class or EQ body type classification."
            icon={<Users className="size-4" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FilterSelect
                label="Class"
                name="class"
                value={filters.className}
                onChange={(value) => setFilter("className", value)}
                options={npcClassOptions}
              />
              <FilterSelect
                label="Body type"
                name="bodyType"
                value={filters.bodyType}
                onChange={(value) => setFilter("bodyType", value)}
                options={npcBodyTypeOptions}
              />
            </div>
          </FilterGroup>

          <FilterGroup
            title="Combat range"
            description="Use level for encounter difficulty and HP for a finer durability window."
            icon={<Activity className="size-4" />}
          >
            <div className="grid grid-cols-2 gap-4">
              <NumberFilter label="Minimum level" name="minLevel" value={filters.minLevel} onChange={(value) => setFilter("minLevel", value)} placeholder="1" min={1} />
              <NumberFilter label="Maximum level" name="maxLevel" value={filters.maxLevel} onChange={(value) => setFilter("maxLevel", value)} placeholder="65" min={1} />
              <NumberFilter label="Minimum HP" name="minHp" value={filters.minHp} onChange={(value) => setFilter("minHp", value)} placeholder="0" />
              <NumberFilter label="Maximum HP" name="maxHp" value={filters.maxHp} onChange={(value) => setFilter("maxHp", value)} placeholder="10000" />
            </div>
          </FilterGroup>

          <FilterGroup
            title="Encounter role"
            description="Separate named encounters, everyday creatures, and merchant populations."
            icon={<Swords className="size-4" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <SegmentedFilter
                label="Name classification"
                value={filters.named}
                onChange={(value) => setFilter("named", value)}
                options={[
                  { value: "", label: "Any" },
                  { value: "true", label: "Named" },
                  { value: "false", label: "Common" }
                ]}
              />
              <SegmentedFilter
                label="Merchant role"
                value={filters.merchant}
                onChange={(value) => setFilter("merchant", value)}
                options={[
                  { value: "", label: "Any" },
                  { value: "true", label: "Merchant" },
                  { value: "false", label: "Other" }
                ]}
              />
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

      <SectionCard title={resultTitle} announceTitle>
        <div className="relative">
          {showResults && results.length > 0 ? (
            <div className={isFetching ? "transition duration-200 opacity-40 blur-[2px]" : undefined}>
              <SimpleTable
                columns={npcTableColumnLabels}
                stickyColumnIndex={0}
                sort={tableSort}
                rowKeys={pagedResults.map((npc) => npc.id)}
                rows={pagedResults.map((npc) => [
                  <Link key={npc.id} href={`/npcs/${npc.id}`} className={rowLinkClass}>
                    {npc.name}
                  </Link>,
                  npc.level,
                  npc.race,
                  npc.klass,
                  npc.zone,
                  npc.hp ? npc.hp.toLocaleString() : "—",
                  <span
                    key={`${npc.id}-kind`}
                    className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                      npc.merchant
                        ? "border-sky-400/20 bg-sky-400/8 text-sky-200"
                        : npc.named
                          ? "border-[#d7a45f]/25 bg-[#d7a45f]/9 text-[#e8c58a]"
                          : "border-white/10 bg-white/5 text-[#aaa08f]"
                    }`}
                  >
                    {npc.merchant ? "Merchant" : npc.named ? "Named" : "Common"}
                  </span>,
                  npc.id
                ])}
              />
              <PaginationControls
                currentPage={visiblePage}
                totalPages={totalPages}
                totalItems={results.length}
                pageSize={npcResultsPerPage}
                onPageChange={setPage}
              />
            </div>
          ) : showResults ? (
            isFetching ? (
              <TableSkeleton columnCount={npcTableColumnLabels.length} />
            ) : draftKey !== displayKey ? (
              <SearchPrompt message="Press Search to apply these filters." />
            ) : (
              <SearchPrompt
                message="No NPCs matched this search."
                hint="Try a partial name, or clear the zone filter to search everywhere."
                action={{ label: "Clear filters", onClick: clearFilters }}
              />
            )
          ) : (
            <SearchPrompt
              message="Enter an NPC name or ID, or open more filters to browse the bestiary."
              hint="You can search by zone, race, class, body type, level, HP, named status, and merchant role."
            />
          )}

          {isFetching && results.length > 0 ? (
            <ClassLoadingIndicator overlay message="Loading NPCs" detail="Checking spawns, zones, and named flags." />
          ) : null}
        </div>
        {resolvedTiming ? <p className="pt-1 text-right text-[11px] uppercase tracking-[0.16em] text-[#9f8e79]">{resolvedTiming}</p> : null}
      </SectionCard>
    </>
  );
}
