"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { FactionSummary } from "@eq-alla/data";
import { Button, Input } from "@eq-alla/ui";
import { ClassLoadingIndicator } from "../../components/class-loading-indicator";
import { PaginationControls, SearchPrompt, SectionCard, SimpleTable } from "../../components/catalog-shell";

type FactionSearchClientProps = {
  initialQuery: string;
};

type SearchResolutionMeta = {
  key: string;
  durationMs: number;
  source: "network" | "cache";
};

type FactionCacheEntry = {
  expiresAt: number;
  results: FactionSummary[];
  touchedAt: number;
};

const factionSearchDebounceMs = 500;
const factionSearchAutoQueryMinLength = 3;
const factionResultsPerPage = 25;
const factionSearchCacheTtlMs = 180_000;
const factionSearchCacheMaxEntries = 12;
const factionSearchSessionStorageKey = "eq-faction-search-cache";

const factionResultCache = new Map<string, FactionCacheEntry>();
let factionCacheHydrated = false;

function buildSearchKey(query: string) {
  return query.trim();
}

function hasQuery(query: string) {
  return buildSearchKey(query).length > 0;
}

function hasAutoSearchableQuery(query: string) {
  return buildSearchKey(query).length >= factionSearchAutoQueryMinLength;
}

function formatDuration(durationMs: number) {
  if (durationMs < 1_000) return `${Math.max(1, Math.round(durationMs))}ms`;
  return `${(durationMs / 1_000).toFixed(durationMs >= 10_000 ? 1 : 2)}s`;
}

function persistFactionCache() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(factionSearchSessionStorageKey, JSON.stringify(Object.fromEntries(factionResultCache.entries())));
  } catch {}
}

function pruneFactionCache(now = Date.now()) {
  for (const [key, entry] of factionResultCache.entries()) {
    if (entry.expiresAt < now) factionResultCache.delete(key);
  }
  if (factionResultCache.size <= factionSearchCacheMaxEntries) return;
  const oldest = [...factionResultCache.entries()]
    .sort((left, right) => left[1].touchedAt - right[1].touchedAt)
    .slice(0, factionResultCache.size - factionSearchCacheMaxEntries);
  for (const [key] of oldest) factionResultCache.delete(key);
}

function hydrateFactionCache() {
  if (factionCacheHydrated || typeof window === "undefined") return;
  factionCacheHydrated = true;
  const payload = window.sessionStorage.getItem(factionSearchSessionStorageKey);
  if (!payload) return;
  try {
    const parsed = JSON.parse(payload) as Record<string, FactionCacheEntry>;
    const now = Date.now();
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry && Array.isArray(entry.results) && typeof entry.expiresAt === "number") {
        factionResultCache.set(key, {
          expiresAt: entry.expiresAt,
          results: entry.results,
          touchedAt: typeof entry.touchedAt === "number" ? entry.touchedAt : now
        });
      }
    }
    pruneFactionCache(now);
    persistFactionCache();
  } catch {
    window.sessionStorage.removeItem(factionSearchSessionStorageKey);
  }
}

function getCachedFactions(key: string) {
  hydrateFactionCache();
  const entry = factionResultCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    factionResultCache.delete(key);
    persistFactionCache();
    return null;
  }
  entry.touchedAt = Date.now();
  return entry.results;
}

function setCachedFactions(key: string, results: FactionSummary[]) {
  hydrateFactionCache();
  factionResultCache.set(key, {
    expiresAt: Date.now() + factionSearchCacheTtlMs,
    results,
    touchedAt: Date.now()
  });
  pruneFactionCache();
  persistFactionCache();
}

export function FactionSearchClient({ initialQuery }: FactionSearchClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<FactionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(hasQuery(initialQuery));
  const [displayKey, setDisplayKey] = useState("");
  const [resolutionMeta, setResolutionMeta] = useState<SearchResolutionMeta | null>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [awaitingManualSubmit, setAwaitingManualSubmit] = useState(false);
  const [page, setPage] = useState(1);
  const abortRef = useRef<AbortController | null>(null);
  const currentUrlKeyRef = useRef(buildSearchKey(initialQuery));
  const lastHandledSubmitRef = useRef(0);

  useEffect(() => {
    const key = buildSearchKey(initialQuery);
    if (!key) return;
    const cached = getCachedFactions(key);
    if (!cached) return;
    setResults(cached);
    setDisplayKey(key);
    setIsFetching(false);
    setResolutionMeta({ key, durationMs: 0, source: "cache" });
  }, [initialQuery]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const submitSearch = () => {
    if (!hasQuery(query)) return;
    setSubmitCount((current) => current + 1);
  };

  useEffect(() => {
    const isForcedSearch = submitCount !== lastHandledSubmitRef.current;
    const timer = window.setTimeout(() => {
      if (isForcedSearch) lastHandledSubmitRef.current = submitCount;
      const nextKey = buildSearchKey(query);
      const nextHref = nextKey ? `${pathname}?q=${encodeURIComponent(nextKey)}` : pathname;

      if (nextKey !== currentUrlKeyRef.current) {
        currentUrlKeyRef.current = nextKey;
        startTransition(() => router.replace(nextHref, { scroll: false }));
      }

      if (nextKey === displayKey && !isForcedSearch) return;

      abortRef.current?.abort();

      if (!nextKey) {
        setResults([]);
        setError(null);
        setDisplayKey(nextKey);
        setIsFetching(false);
        setResolutionMeta(null);
        setAwaitingManualSubmit(false);
        return;
      }

      if (!isForcedSearch && !hasAutoSearchableQuery(query)) {
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
      const cached = getCachedFactions(nextKey);
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
          const response = await fetch(`/api/factions?q=${encodeURIComponent(nextKey)}`, { signal: controller.signal });
          if (!response.ok) throw new Error(`Search failed with ${response.status}`);
          const payload = (await response.json()) as { data?: FactionSummary[] };
          if (controller.signal.aborted) return;
          setResults(payload.data ?? []);
          setDisplayKey(nextKey);
          setCachedFactions(nextKey, payload.data ?? []);
          setResolutionMeta({ key: nextKey, durationMs: performance.now() - startedAt, source: "network" });
        } catch (searchError) {
          if (controller.signal.aborted) return;
          console.error(searchError);
          setError("Could not refresh faction results. Showing the last successful search.");
        } finally {
          if (abortRef.current === controller) {
            abortRef.current = null;
            setIsFetching(false);
          }
        }
      })();
    }, isForcedSearch ? 0 : factionSearchDebounceMs);

    return () => window.clearTimeout(timer);
  }, [displayKey, pathname, query, router, submitCount]);

  const activeQuery = buildSearchKey(query);
  const totalPages = Math.max(1, Math.ceil(results.length / factionResultsPerPage));
  const visiblePage = Math.min(page, totalPages);
  const pagedResults = results.slice((visiblePage - 1) * factionResultsPerPage, visiblePage * factionResultsPerPage);
  const hasShortQuery = activeQuery.length > 0 && activeQuery.length < factionSearchAutoQueryMinLength;
  const showResults = activeQuery.length > 0 || isFetching || displayKey.length > 0;
  const resultTitle = showResults ? (isFetching && results.length === 0 ? "Loading factions" : `${results.length} factions`) : "Results";
  const statusLabel = error ? error : isFetching ? "Refreshing results..." : "Search updates automatically";
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
      <SectionCard title="Filter" right={<p className="text-xs font-medium text-[#ccb594]">{statusLabel}</p>}>
        <div className="flex gap-3">
          <Input
            name="q"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitSearch();
              }
            }}
            placeholder="Mayong..."
          />
          <Button type="button" onClick={submitSearch}>
            Search
          </Button>
        </div>
      </SectionCard>
      <SectionCard title={resultTitle}>
        {showResults && results.length > 0 ? (
          <>
            <SimpleTable
              columns={["Name", "Faction ID"]}
              rows={pagedResults.map((faction) => [
                <Link key={faction.id} href={`/factions/${faction.id}`} className="font-medium hover:underline">
                  {faction.name}
                </Link>,
                faction.id
              ])}
            />
            <PaginationControls
              currentPage={visiblePage}
              totalPages={totalPages}
              totalItems={results.length}
              pageSize={factionResultsPerPage}
              onPageChange={setPage}
            />
          </>
        ) : showResults ? (
          isFetching ? (
            <ClassLoadingIndicator message="Loading factions" detail="Resolving alliances and rivalries." />
          ) : awaitingManualSubmit && hasShortQuery ? (
            <SearchPrompt message={`Type ${factionSearchAutoQueryMinLength}+ characters to auto-search, or press Enter to search now.`} />
          ) : (
            <SearchPrompt message="No factions matched this search." />
          )
        ) : (
          <SearchPrompt message="Enter a faction name to load results." />
        )}
        {resolvedTiming ? <p className="pt-1 text-right text-[11px] uppercase tracking-[0.16em] text-[#9f8e79]">{resolvedTiming}</p> : null}
      </SectionCard>
    </>
  );
}
