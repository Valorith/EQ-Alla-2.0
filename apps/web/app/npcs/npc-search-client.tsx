"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { NpcSummary } from "@eq-alla/data";
import { Input, Button } from "@eq-alla/ui";
import { ClassLoadingIndicator } from "../../components/class-loading-indicator";
import { PaginationControls, SearchPrompt, SectionCard, SelectField, SimpleTable } from "../../components/catalog-shell";
import { waitForLoadingIndicator } from "../../components/loading-state";

type NpcSearchClientProps = {
  mode: "basic" | "advanced";
  initialFilters: {
    q: string;
    zone: string;
    race: string;
    minLevel: string;
    maxLevel: string;
    named: string;
    showLevel: string;
  };
};

type NpcFilters = {
  q: string;
  zone: string;
  race: string;
  minLevel: string;
  maxLevel: string;
  named: string;
  showLevel: string;
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
  if (mode === "basic" && filters.zone) params.set("zone", filters.zone);
  if (mode === "advanced") {
    if (filters.race) params.set("race", filters.race);
    if (filters.minLevel) params.set("minLevel", filters.minLevel);
    if (filters.maxLevel) params.set("maxLevel", filters.maxLevel);
    if (filters.named) params.set("named", filters.named);
    if (filters.showLevel) params.set("showLevel", filters.showLevel);
  }
  return params;
}

function hasActiveFilters(filters: NpcFilters) {
  return (
    filters.q.trim().length > 0 ||
    filters.zone.length > 0 ||
    filters.race.length > 0 ||
    filters.minLevel.length > 0 ||
    filters.maxLevel.length > 0 ||
    filters.named.length > 0 ||
    filters.showLevel.length > 0
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
  const [filters, setFilters] = useState<NpcFilters>(initialFilters);
  const [results, setResults] = useState<NpcSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [displayKey, setDisplayKey] = useState("");
  const [resolutionMeta, setResolutionMeta] = useState<SearchResolutionMeta | null>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [page, setPage] = useState(1);
  const abortRef = useRef<AbortController | null>(null);
  const currentUrlKeyRef = useRef(buildSearchParams(initialFilters, mode).toString());
  const lastHandledSubmitRef = useRef(0);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const nextKey = buildSearchParams(initialFilters, mode).toString();

    setFilters(initialFilters);
    currentUrlKeyRef.current = nextKey;
    abortRef.current?.abort();

    if (!nextKey) {
      setResults([]);
      setError(null);
      setDisplayKey("");
      setIsFetching(false);
      setResolutionMeta(null);
      setPage(1);
      return;
    }

    setResults([]);
    setError(null);
    setDisplayKey("");
    setIsFetching(false);
    setResolutionMeta(null);
    setPage(1);
    setSubmitCount((current) => current + 1);
  }, [initialFilters, mode]);

  const setFilter = (key: keyof NpcFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const submitSearch = () => {
    if (!hasActiveFilters(filters)) return;
    setSubmitCount((current) => current + 1);
  };

  const clearFilters = () => {
    abortRef.current?.abort();
    setFilters({
      q: "",
      zone: "",
      race: "",
      minLevel: "",
      maxLevel: "",
      named: "",
      showLevel: ""
    });
    setResults([]);
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
    if (submitCount === 0 || submitCount === lastHandledSubmitRef.current) {
      return;
    }

    lastHandledSubmitRef.current = submitCount;
    const nextKey = buildSearchParams(filters, mode).toString();
    const nextHref = nextKey ? `${pathname}?${nextKey}` : pathname;
    if (nextKey !== currentUrlKeyRef.current) {
      currentUrlKeyRef.current = nextKey;
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", nextHref);
      }
    }

    abortRef.current?.abort();

    if (!hasActiveFilters(filters)) {
      setResults([]);
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

  const totalPages = Math.max(1, Math.ceil(results.length / npcResultsPerPage));
  const visiblePage = Math.min(page, totalPages);
  const pagedResults = results.slice((visiblePage - 1) * npcResultsPerPage, visiblePage * npcResultsPerPage);
  const draftKey = buildSearchParams(filters, mode).toString();
  const showResults = hasActiveFilters(filters) || isFetching || displayKey.length > 0;
  const resultTitle = showResults ? (isFetching && results.length === 0 ? "Loading NPCs" : `${results.length} ${mode === "advanced" ? "matches" : "matching NPCs"}`) : "Results";
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
        title={mode === "advanced" ? "Advanced filters" : "Filters"}
        right={
          <p className="text-xs font-medium text-[#ccb594]">{statusLabel}</p>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Name</span>
            <Input
              name={mode === "advanced" ? "name" : "q"}
              type="search"
              value={filters.q}
              onChange={(event) => setFilter("q", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitSearch();
                }
              }}
              placeholder={mode === "advanced" ? "V'Lyra..." : "mistmoore guard..."}
            />
          </label>
          {mode === "basic" ? null : (
            <>
              <SelectField label="Race" name="race" value={filters.race} onChange={(value) => setFilter("race", value)} options={["Dark Elf", "Human"]} />
              <SelectField label="Min level" name="minLevel" value={filters.minLevel} onChange={(value) => setFilter("minLevel", value)} options={["30", "50", "60"]} />
              <SelectField label="Max level" name="maxLevel" value={filters.maxLevel} onChange={(value) => setFilter("maxLevel", value)} options={["38", "52", "60"]} />
              <SelectField label="Named only" name="named" value={filters.named} onChange={(value) => setFilter("named", value)} options={["true"]} />
              <SelectField label="Show level" name="showLevel" value={filters.showLevel} onChange={(value) => setFilter("showLevel", value)} options={["true"]} />
            </>
          )}
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
        <div className="relative">
          {showResults && results.length > 0 ? (
            <div className={isFetching ? "transition duration-200 opacity-40 blur-[2px]" : undefined}>
              <SimpleTable
                columns={mode === "advanced" && filters.showLevel ? ["Name", "Level"] : mode === "advanced" ? ["Name"] : ["Name", "NPC ID"]}
                rows={pagedResults.map((npc) =>
                  mode === "advanced"
                    ? [
                        <Link key={npc.id} href={`/npcs/${npc.id}`} className="font-medium hover:underline">
                          {npc.name}
                        </Link>,
                        ...(filters.showLevel ? [npc.level] : [])
                      ]
                    : [
                        <Link key={npc.id} href={`/npcs/${npc.id}`} className="font-medium hover:underline">
                          {npc.name}
                        </Link>,
                        npc.id
                      ]
                )}
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
              <ClassLoadingIndicator message="Loading NPCs" detail="Checking spawns, zones, and named flags." />
            ) : draftKey !== displayKey ? (
              <SearchPrompt message="Press Search to apply these filters." />
            ) : (
              <SearchPrompt message="No NPCs matched this search." />
            )
          ) : (
            <SearchPrompt message="Enter an NPC name to load results." />
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
