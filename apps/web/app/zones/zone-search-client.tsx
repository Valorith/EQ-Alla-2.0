"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ZoneSummary } from "@eq-alla/data";
import { Button, Input } from "@eq-alla/ui";
import { ClassLoadingIndicator } from "../../components/class-loading-indicator";
import { PaginationControls, SearchPrompt, SectionCard, SelectField, SimpleTable } from "../../components/catalog-shell";

type ZoneSearchClientProps = {
  initialQuery: string;
  initialEra: string;
};

type SearchResolutionMeta = {
  key: string;
  durationMs: number;
  source: "network" | "cache";
};

type ZoneFilters = {
  q: string;
  era: string;
};

type ZoneCacheEntry = {
  expiresAt: number;
  results: ZoneSummary[];
  touchedAt: number;
};

const zoneSearchDebounceMs = 500;
const zoneSearchAutoQueryMinLength = 3;
const zoneResultsPerPage = 20;
const zoneSearchCacheTtlMs = 180_000;
const zoneSearchCacheMaxEntries = 12;
const zoneSearchSessionStorageKey = "eq-zone-search-cache";

const zoneResultCache = new Map<string, ZoneCacheEntry>();
let zoneCacheHydrated = false;

function buildSearchParams(filters: ZoneFilters) {
  const params = new URLSearchParams();
  const query = filters.q.trim();
  if (query) params.set("q", query);
  if (filters.era) params.set("era", filters.era);
  return params;
}

function hasActiveFilters(filters: ZoneFilters) {
  return filters.q.trim().length > 0 || filters.era.length > 0;
}

function hasAutoSearchableQuery(filters: ZoneFilters) {
  return filters.q.trim().length >= zoneSearchAutoQueryMinLength;
}

function formatDuration(durationMs: number) {
  if (durationMs < 1_000) return `${Math.max(1, Math.round(durationMs))}ms`;
  return `${(durationMs / 1_000).toFixed(durationMs >= 10_000 ? 1 : 2)}s`;
}

function persistZoneCache() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(zoneSearchSessionStorageKey, JSON.stringify(Object.fromEntries(zoneResultCache.entries())));
  } catch {}
}

function pruneZoneCache(now = Date.now()) {
  for (const [key, entry] of zoneResultCache.entries()) {
    if (entry.expiresAt < now) zoneResultCache.delete(key);
  }
  if (zoneResultCache.size <= zoneSearchCacheMaxEntries) return;
  const oldest = [...zoneResultCache.entries()]
    .sort((left, right) => left[1].touchedAt - right[1].touchedAt)
    .slice(0, zoneResultCache.size - zoneSearchCacheMaxEntries);
  for (const [key] of oldest) zoneResultCache.delete(key);
}

function hydrateZoneCache() {
  if (zoneCacheHydrated || typeof window === "undefined") return;
  zoneCacheHydrated = true;
  const payload = window.sessionStorage.getItem(zoneSearchSessionStorageKey);
  if (!payload) return;
  try {
    const parsed = JSON.parse(payload) as Record<string, ZoneCacheEntry>;
    const now = Date.now();
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry && Array.isArray(entry.results) && typeof entry.expiresAt === "number") {
        zoneResultCache.set(key, {
          expiresAt: entry.expiresAt,
          results: entry.results,
          touchedAt: typeof entry.touchedAt === "number" ? entry.touchedAt : now
        });
      }
    }
    pruneZoneCache(now);
    persistZoneCache();
  } catch {
    window.sessionStorage.removeItem(zoneSearchSessionStorageKey);
  }
}

function getCachedZones(key: string) {
  hydrateZoneCache();
  const entry = zoneResultCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    zoneResultCache.delete(key);
    persistZoneCache();
    return null;
  }
  entry.touchedAt = Date.now();
  return entry.results;
}

function setCachedZones(key: string, results: ZoneSummary[]) {
  hydrateZoneCache();
  zoneResultCache.set(key, {
    expiresAt: Date.now() + zoneSearchCacheTtlMs,
    results,
    touchedAt: Date.now()
  });
  pruneZoneCache();
  persistZoneCache();
}

export function ZoneSearchClient({ initialQuery, initialEra }: ZoneSearchClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<ZoneFilters>({ q: initialQuery, era: initialEra });
  const [results, setResults] = useState<ZoneSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(hasActiveFilters({ q: initialQuery, era: initialEra }));
  const [displayKey, setDisplayKey] = useState("");
  const [resolutionMeta, setResolutionMeta] = useState<SearchResolutionMeta | null>(null);
  const [submitCount, setSubmitCount] = useState(hasActiveFilters({ q: initialQuery, era: initialEra }) ? 1 : 0);
  const [awaitingManualSubmit, setAwaitingManualSubmit] = useState(false);
  const [page, setPage] = useState(1);
  const abortRef = useRef<AbortController | null>(null);
  const currentUrlKeyRef = useRef(buildSearchParams({ q: initialQuery, era: initialEra }).toString());
  const lastHandledSubmitRef = useRef(0);

  useEffect(() => {
    const key = buildSearchParams({ q: initialQuery, era: initialEra }).toString();
    if (!key) return;
    const cached = getCachedZones(key);
    if (!cached) return;
    setResults(cached);
    setDisplayKey(key);
    setIsFetching(false);
    setResolutionMeta({ key, durationMs: 0, source: "cache" });
  }, [initialEra, initialQuery]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const setFilter = (key: keyof ZoneFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const submitSearch = () => {
    if (!hasActiveFilters(filters)) return;
    setSubmitCount((current) => current + 1);
  };

  const clearFilters = () => {
    setFilters({ q: "", era: "" });
  };

  useEffect(() => {
    const isForcedSearch = submitCount !== lastHandledSubmitRef.current;
    const timer = window.setTimeout(() => {
      if (isForcedSearch) lastHandledSubmitRef.current = submitCount;
      const nextKey = buildSearchParams(filters).toString();
      const nextHref = nextKey ? `${pathname}?${nextKey}` : pathname;
      if (nextKey !== currentUrlKeyRef.current) {
        currentUrlKeyRef.current = nextKey;
        startTransition(() => router.replace(nextHref, { scroll: false }));
      }
      if (nextKey === displayKey && !isForcedSearch) return;

      abortRef.current?.abort();

      if (!hasActiveFilters(filters)) {
        setResults([]);
        setError(null);
        setDisplayKey(nextKey);
        setIsFetching(false);
        setResolutionMeta(null);
        setAwaitingManualSubmit(false);
        return;
      }

      if (!isForcedSearch && !hasAutoSearchableQuery(filters)) {
        setResults([]);
        setError(null);
        setDisplayKey(nextKey);
        setIsFetching(false);
        setResolutionMeta(null);
        setAwaitingManualSubmit(true);
        return;
      }

      setAwaitingManualSubmit(false);
      const startedAt = performance.now();
      const cached = getCachedZones(nextKey);
      if (cached) {
        setResults(cached);
        setDisplayKey(nextKey);
        setError(null);
        setIsFetching(false);
        setResolutionMeta({ key: nextKey, durationMs: performance.now() - startedAt, source: "cache" });
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setIsFetching(true);
      setError(null);

      void (async () => {
        try {
          const response = await fetch(`/api/zones?${nextKey}`, { signal: controller.signal });
          if (!response.ok) throw new Error(`Search failed with ${response.status}`);
          const payload = (await response.json()) as { data?: ZoneSummary[] };
          if (controller.signal.aborted) return;
          setResults(payload.data ?? []);
          setDisplayKey(nextKey);
          setCachedZones(nextKey, payload.data ?? []);
          setResolutionMeta({ key: nextKey, durationMs: performance.now() - startedAt, source: "network" });
        } catch (searchError) {
          if (controller.signal.aborted) return;
          console.error(searchError);
          setError("Could not refresh zone results. Showing the last successful search.");
        } finally {
          if (abortRef.current === controller) {
            abortRef.current = null;
            setIsFetching(false);
          }
        }
      })();
    }, isForcedSearch ? 0 : zoneSearchDebounceMs);

    return () => window.clearTimeout(timer);
  }, [displayKey, filters, pathname, router, submitCount]);

  const activeQuery = filters.q.trim();
  const totalPages = Math.max(1, Math.ceil(results.length / zoneResultsPerPage));
  const visiblePage = Math.min(page, totalPages);
  const pagedResults = results.slice((visiblePage - 1) * zoneResultsPerPage, visiblePage * zoneResultsPerPage);
  const hasShortQuery = activeQuery.length > 0 && activeQuery.length < zoneSearchAutoQueryMinLength;
  const draftKey = buildSearchParams(filters).toString();
  const showResults = hasActiveFilters(filters) || isFetching || displayKey.length > 0;
  const resultTitle = showResults ? (isFetching && results.length === 0 ? "Loading zones" : `${results.length} zones`) : "Results";
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
        right={
          <div className="flex items-center gap-4">
            <Link href="/zones/by-level" className="text-sm text-white/70 hover:text-white hover:underline">
              By level
            </Link>
            <p className="text-xs font-medium text-[#ccb594]">{statusLabel}</p>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Zone</span>
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
              placeholder="Mistmoore..."
            />
          </label>
          <SelectField label="Era" name="era" value={filters.era} onChange={(value) => setFilter("era", value)} options={["Classic", "Planes of Power"]} />
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
      <SectionCard title={resultTitle}>
        {showResults && results.length > 0 ? (
          <>
            <SimpleTable
              columns={["Name", "Short name", "ID", "Spawn points"]}
              rows={pagedResults.map((zone) => [
                <Link key={zone.shortName} href={`/zones/${zone.shortName}`} className="font-medium hover:underline">
                  {zone.longName}
                </Link>,
                zone.shortName,
                zone.id,
                zone.spawns
              ])}
            />
            <PaginationControls
              currentPage={visiblePage}
              totalPages={totalPages}
              totalItems={results.length}
              pageSize={zoneResultsPerPage}
              onPageChange={setPage}
            />
          </>
        ) : showResults ? (
          isFetching ? (
            <ClassLoadingIndicator message="Loading zones" detail="Surveying eras, levels, and populations." />
          ) : awaitingManualSubmit ? (
            <SearchPrompt
              message={
                hasShortQuery
                  ? `Type ${zoneSearchAutoQueryMinLength}+ characters to auto-search, or press Search to run now.`
                  : "Press Search to apply these filters."
              }
            />
          ) : (
            <SearchPrompt message="No zones matched this search." />
          )
        ) : (
          <SearchPrompt message="Enter a zone name to load results." />
        )}
        {resolvedTiming ? <p className="pt-1 text-right text-[11px] uppercase tracking-[0.16em] text-[#9f8e79]">{resolvedTiming}</p> : null}
      </SectionCard>
    </>
  );
}
