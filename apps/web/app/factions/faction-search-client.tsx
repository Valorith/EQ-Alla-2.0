"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { FactionSummary } from "@eq-alla/data";
import { Button, Input } from "@eq-alla/ui";
import { ClassLoadingIndicator } from "../../components/class-loading-indicator";
import { PaginationControls, SearchPrompt, SectionCard, SelectField, SimpleTable } from "../../components/catalog-shell";
import { waitForLoadingIndicator } from "../../components/loading-state";

type FactionSearchClientProps = {
  initialQuery: string;
  initialZone: string;
  initialRelationship: string;
  initialViewAll: boolean;
};

type FactionFilters = {
  q: string;
  zone: string;
  relationship: string;
  viewAll: boolean;
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

const factionResultsPerPage = 25;
const factionSearchCacheTtlMs = 180_000;
const factionSearchCacheMaxEntries = 12;
const factionSearchSessionStorageKey = "eq-faction-search-cache";
const factionRelationshipOptions = ["Raises", "Lowers", "Both", "No NPC Modifiers"];

const factionResultCache = new Map<string, FactionCacheEntry>();
let factionCacheHydrated = false;

function buildSearchParams(filters: FactionFilters) {
  const params = new URLSearchParams();
  const query = filters.q.trim();
  const zone = filters.zone.trim();
  if (query) params.set("q", query);
  if (zone) params.set("zone", zone);
  if (filters.relationship) params.set("relationship", mapRelationshipLabelToValue(filters.relationship));
  if (filters.viewAll) params.set("view", "all");
  return params;
}

function buildSearchKey(filters: FactionFilters) {
  return buildSearchParams(filters).toString();
}

function hasQuery(filters: FactionFilters) {
  return filters.viewAll || filters.q.trim().length > 0 || filters.zone.trim().length > 0 || filters.relationship.length > 0;
}

function mapRelationshipLabelToValue(label: string) {
  switch (label) {
    case "Raises":
      return "raises";
    case "Lowers":
      return "lowers";
    case "Both":
      return "both";
    case "No NPC Modifiers":
      return "none";
    default:
      return "";
  }
}

function mapRelationshipValueToLabel(value: string) {
  switch (value) {
    case "raises":
      return "Raises";
    case "lowers":
      return "Lowers";
    case "both":
      return "Both";
    case "none":
      return "No NPC Modifiers";
    default:
      return "";
  }
}

function describeRelationships(faction: FactionSummary) {
  if (faction.raisedByCount > 0 && faction.loweredByCount > 0) {
    return `${faction.raisedByCount} raise, ${faction.loweredByCount} lower`;
  }

  if (faction.raisedByCount > 0) {
    return `${faction.raisedByCount} raise`;
  }

  if (faction.loweredByCount > 0) {
    return `${faction.loweredByCount} lower`;
  }

  return "No NPC modifiers";
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

function TextFilterField({
  label,
  name,
  value,
  placeholder,
  onChange,
  onEnter
}: {
  label: string;
  name: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onEnter: () => void;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{label}</span>
      <Input
        name={name}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onEnter();
          }
        }}
        placeholder={placeholder}
      />
    </label>
  );
}

export function FactionSearchClient({ initialQuery, initialZone, initialRelationship, initialViewAll }: FactionSearchClientProps) {
  const pathname = usePathname();
  const initialFilters: FactionFilters = {
    q: initialQuery,
    zone: initialZone,
    relationship: mapRelationshipValueToLabel(initialRelationship),
    viewAll: initialViewAll
  };
  const [filters, setFilters] = useState<FactionFilters>(initialFilters);
  const [results, setResults] = useState<FactionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [displayKey, setDisplayKey] = useState("");
  const [resolutionMeta, setResolutionMeta] = useState<SearchResolutionMeta | null>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [page, setPage] = useState(1);
  const abortRef = useRef<AbortController | null>(null);
  const currentUrlKeyRef = useRef(buildSearchKey(initialFilters));
  const lastHandledSubmitRef = useRef(0);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const nextKey = buildSearchKey(initialFilters);

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
  }, [initialQuery, initialRelationship, initialViewAll, initialZone]);

  const setFilter = (key: keyof FactionFilters, value: string | boolean) => {
    setFilters((current) => ({
      ...current,
      viewAll: key === "viewAll" ? Boolean(value) : false,
      [key]: value
    }));
  };

  const submitSearch = () => {
    if (!hasQuery(filters)) return;
    setSubmitCount((current) => current + 1);
  };

  const clearFilters = () => {
    abortRef.current?.abort();
    setFilters({
      q: "",
      zone: "",
      relationship: "",
      viewAll: false
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

  const viewAllFactions = () => {
    setFilters((current) => ({
      ...current,
      viewAll: true
    }));
    setSubmitCount((current) => current + 1);
  };

  useEffect(() => {
    if (submitCount === 0 || submitCount === lastHandledSubmitRef.current) {
      return;
    }

    lastHandledSubmitRef.current = submitCount;
    const nextKey = buildSearchKey(filters);
    const nextHref = nextKey ? `${pathname}?${nextKey}` : pathname;

    if (nextKey !== currentUrlKeyRef.current) {
      currentUrlKeyRef.current = nextKey;
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", nextHref);
      }
    }

    abortRef.current?.abort();

    if (!hasQuery(filters)) {
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

    const cached = getCachedFactions(nextKey);
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
        const response = await fetch(`/api/factions?${nextKey}`, { signal: controller.signal });
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
          await waitForLoadingIndicator(startedAt);
          setIsFetching(false);
        }
      }
    })();
  }, [filters, pathname, submitCount]);

  const activeQuery = buildSearchKey(filters);
  const totalPages = Math.max(1, Math.ceil(results.length / factionResultsPerPage));
  const visiblePage = Math.min(page, totalPages);
  const pagedResults = results.slice((visiblePage - 1) * factionResultsPerPage, visiblePage * factionResultsPerPage);
  const showResults = activeQuery.length > 0 || isFetching || displayKey.length > 0;
  const resultTitle = showResults ? (isFetching && results.length === 0 ? "Loading factions" : `${results.length} factions`) : "Results";
  const statusLabel = error ? error : isFetching ? "Refreshing results..." : activeQuery === displayKey && displayKey ? "Filters applied" : "Press Search or View all to apply filters";
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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <TextFilterField
            label="Faction Name or ID"
            name="q"
            value={filters.q}
            onChange={(value) => setFilter("q", value)}
            onEnter={submitSearch}
            placeholder="Mayong's Retainers or 4001"
          />
          <TextFilterField
            label="Aligned Zone"
            name="zone"
            value={filters.zone}
            onChange={(value) => setFilter("zone", value)}
            onEnter={submitSearch}
            placeholder="Castle Mistmoore"
          />
          <SelectField
            label="NPC Relationship"
            name="relationship"
            value={filters.relationship}
            onChange={(value) => setFilter("relationship", value)}
            options={factionRelationshipOptions}
          />
          <div className="grid gap-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Actions</span>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={submitSearch} disabled={!hasQuery(filters)}>
                Search
              </Button>
              <Button type="button" variant="outline" onClick={viewAllFactions}>
                View all
              </Button>
              <Button type="button" variant="outline" onClick={clearFilters} disabled={!hasQuery(filters)}>
                Clear
              </Button>
            </div>
            <p className="text-xs leading-5 text-[#9f8e79]">
              Use a specific filter to narrow the index, or jump straight into the full faction catalog.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 lg:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ccb594]">Current mode</p>
            <p className="mt-2 text-sm leading-6 text-[#e8dfcf]">
              {filters.viewAll
                ? "Browsing the full faction index."
                : hasQuery(filters)
                  ? "Showing filtered results based on the controls above."
                  : "Waiting for a search, zone filter, relationship filter, or a View all request."}
            </p>
          </div>
        </div>
      </SectionCard>
      <SectionCard title={resultTitle}>
        <div className="relative">
          {showResults && results.length > 0 ? (
            <div className={isFetching ? "transition duration-200 opacity-40 blur-[2px]" : undefined}>
              <SimpleTable
                columns={["Name", "Aligned Zone", "NPC Relationship", "Faction ID"]}
                rows={pagedResults.map((faction) => [
                  <Link key={faction.id} href={`/factions/${faction.id}`} className="font-medium hover:underline">
                    {faction.name}
                  </Link>,
                  faction.alignedZone,
                  describeRelationships(faction),
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
            </div>
          ) : showResults ? (
            isFetching ? (
              <ClassLoadingIndicator message="Loading factions" detail="Resolving alliances and rivalries." />
            ) : activeQuery !== displayKey ? (
              <SearchPrompt message="Press Search or View all to apply these filters." />
            ) : (
              <SearchPrompt message="No factions matched this search." />
            )
          ) : (
            <SearchPrompt message="Enter a faction name or zone, choose an NPC relationship filter, or use View all factions." />
          )}

          {isFetching && results.length > 0 ? (
            <ClassLoadingIndicator overlay message="Loading factions" detail="Resolving alliances and rivalries." />
          ) : null}
        </div>
        {resolvedTiming ? <p className="pt-1 text-right text-[11px] uppercase tracking-[0.16em] text-[#9f8e79]">{resolvedTiming}</p> : null}
      </SectionCard>
    </>
  );
}
