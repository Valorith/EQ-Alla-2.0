"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { SearchHit } from "@eq-alla/data";
import { Button, Input } from "@eq-alla/ui";
import { ClassLoadingIndicator } from "../../components/class-loading-indicator";
import { PaginationControls, SearchPrompt, SectionCard } from "../../components/catalog-shell";
import { ItemIcon } from "../../components/item-icon";
import { SpellIcon } from "../../components/spell-icon";

type SearchClientProps = {
  initialQuery: string;
};

type SearchResolutionMeta = {
  key: string;
  durationMs: number;
  source: "network" | "cache";
};

type SearchCacheEntry = {
  expiresAt: number;
  hits: SearchHit[];
  touchedAt: number;
};

const searchCacheTtlMs = 180_000;
const searchCacheMaxEntries = 12;
const searchSessionStorageKey = "eq-global-search-cache";
const globalSearchResultsPerPage = 12;

const searchResultCache = new Map<string, SearchCacheEntry>();
let searchCacheHydrated = false;
const globalSearchOrder: SearchHit["type"][] = ["zone", "npc", "item", "spell", "faction", "recipe"];
const globalSearchLabels: Record<SearchHit["type"], string> = {
  item: "Items",
  spell: "Spells",
  npc: "Mobs",
  zone: "Zones",
  faction: "Factions",
  recipe: "Trade Skills",
  pet: "Pets",
  task: "Tasks",
  spawngroup: "Spawn Groups"
};

function buildSearchKey(query: string) {
  return query.trim();
}

function hasQuery(query: string) {
  return buildSearchKey(query).length > 0;
}

function formatDuration(durationMs: number) {
  if (durationMs < 1_000) {
    return `${Math.max(1, Math.round(durationMs))}ms`;
  }

  return `${(durationMs / 1_000).toFixed(durationMs >= 10_000 ? 1 : 2)}s`;
}

function persistSearchCache() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload = Object.fromEntries(searchResultCache.entries());
    window.sessionStorage.setItem(searchSessionStorageKey, JSON.stringify(payload));
  } catch {
    // Ignore storage failures and keep using memory cache.
  }
}

function pruneSearchCache(now = Date.now()) {
  for (const [key, entry] of searchResultCache.entries()) {
    if (entry.expiresAt < now) {
      searchResultCache.delete(key);
    }
  }

  if (searchResultCache.size <= searchCacheMaxEntries) {
    return;
  }

  const oldestEntries = [...searchResultCache.entries()]
    .sort((left, right) => left[1].touchedAt - right[1].touchedAt)
    .slice(0, searchResultCache.size - searchCacheMaxEntries);

  for (const [key] of oldestEntries) {
    searchResultCache.delete(key);
  }
}

function hydrateSearchCache() {
  if (searchCacheHydrated || typeof window === "undefined") {
    return;
  }

  searchCacheHydrated = true;

  const payload = window.sessionStorage.getItem(searchSessionStorageKey);
  if (!payload) {
    return;
  }

  try {
    const parsed = JSON.parse(payload) as Record<string, SearchCacheEntry>;
    const now = Date.now();

    for (const [key, entry] of Object.entries(parsed)) {
      if (entry && Array.isArray(entry.hits) && typeof entry.expiresAt === "number") {
        searchResultCache.set(key, {
          expiresAt: entry.expiresAt,
          hits: entry.hits,
          touchedAt: typeof entry.touchedAt === "number" ? entry.touchedAt : now
        });
      }
    }

    pruneSearchCache(now);
    persistSearchCache();
  } catch {
    window.sessionStorage.removeItem(searchSessionStorageKey);
  }
}

function getClientCachedHits(key: string) {
  hydrateSearchCache();

  const entry = searchResultCache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt < Date.now()) {
    searchResultCache.delete(key);
    persistSearchCache();
    return null;
  }

  entry.touchedAt = Date.now();
  return entry.hits;
}

function setClientCachedHits(key: string, hits: SearchHit[]) {
  hydrateSearchCache();

  searchResultCache.set(key, {
    expiresAt: Date.now() + searchCacheTtlMs,
    hits,
    touchedAt: Date.now()
  });

  pruneSearchCache();
  persistSearchCache();
}

export function SearchClient({ initialQuery }: SearchClientProps) {
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [displayKey, setDisplayKey] = useState("");
  const [resolutionMeta, setResolutionMeta] = useState<SearchResolutionMeta | null>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [activeType, setActiveType] = useState<SearchHit["type"] | null>(null);
  const [page, setPage] = useState(1);
  const abortRef = useRef<AbortController | null>(null);
  const currentUrlKeyRef = useRef(buildSearchKey(initialQuery));
  const lastHandledSubmitRef = useRef(0);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const submitSearch = () => {
    if (!hasQuery(query)) {
      return;
    }

    setSubmitCount((current) => current + 1);
  };

  useEffect(() => {
    if (submitCount === 0 || submitCount === lastHandledSubmitRef.current) {
      return;
    }

    lastHandledSubmitRef.current = submitCount;
    const nextKey = buildSearchKey(query);
    const nextHref = nextKey ? `${pathname}?q=${encodeURIComponent(nextKey)}` : pathname;

    if (nextKey !== currentUrlKeyRef.current) {
      currentUrlKeyRef.current = nextKey;
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", nextHref);
      }
    }

    abortRef.current?.abort();

    if (!nextKey) {
      setHits([]);
      setError(null);
      setDisplayKey("");
      setIsFetching(false);
      setResolutionMeta(null);
      return;
    }

    const startedAt = performance.now();
    const cachedHits = getClientCachedHits(nextKey);
    if (cachedHits) {
      setHits(cachedHits);
      setDisplayKey(nextKey);
      setError(null);
      setIsFetching(false);
      setResolutionMeta({
        key: nextKey,
        durationMs: performance.now() - startedAt,
        source: "cache"
      });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsFetching(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(nextKey)}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Search failed with ${response.status}`);
        }

        const payload = (await response.json()) as { data?: SearchHit[] };

        if (controller.signal.aborted) {
          return;
        }

        setHits(payload.data ?? []);
        setDisplayKey(nextKey);
        setClientCachedHits(nextKey, payload.data ?? []);
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
        setError("Could not refresh global search results. Showing the last successful search.");
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsFetching(false);
        }
      }
    })();
  }, [pathname, query, submitCount]);

  const activeQuery = buildSearchKey(query);
  const groupedHits = globalSearchOrder
    .map((type) => ({ type, hits: hits.filter((hit) => hit.type === type) }))
    .filter((entry) => entry.hits.length > 0);
  const visibleType = groupedHits.some((entry) => entry.type === activeType) ? activeType : groupedHits[0]?.type ?? null;
  const visibleHits = groupedHits.find((entry) => entry.type === visibleType)?.hits ?? [];
  const totalPages = Math.max(1, Math.ceil(visibleHits.length / globalSearchResultsPerPage));
  const visiblePage = Math.min(page, totalPages);
  const pagedVisibleHits = visibleHits.slice((visiblePage - 1) * globalSearchResultsPerPage, visiblePage * globalSearchResultsPerPage);
  const showResults = activeQuery.length > 0 || isFetching || displayKey.length > 0;
  const resultTitle = showResults ? (isFetching && hits.length === 0 ? "Loading matches" : `${hits.length} matches`) : "Results";
  const statusLabel = error ? error : isFetching ? "Refreshing results..." : activeQuery === displayKey && displayKey ? "Filters applied" : "Press Search to apply filters";
  const resolvedTiming =
    resolutionMeta && resolutionMeta.key === displayKey && !isFetching
      ? `Loaded in ${formatDuration(resolutionMeta.durationMs)}${resolutionMeta.source === "cache" ? " from cache" : ""}`
      : null;

  useEffect(() => {
    if (groupedHits.length === 0) {
      setActiveType(null);
      return;
    }
    if (!visibleType) {
      setActiveType(groupedHits[0].type);
    }
  }, [groupedHits, visibleType]);

  useEffect(() => {
    setPage(1);
  }, [displayKey, visibleType]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <>
      <SectionCard title="Query" right={<p className="text-xs font-medium text-[#ccb594]">{statusLabel}</p>}>
        <div className="flex flex-col gap-3 sm:flex-row">
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
            placeholder="Search for zones, NPCs, items..."
          />
          <Button type="button" onClick={submitSearch}>
            Search
          </Button>
        </div>
      </SectionCard>

      <SectionCard title={resultTitle}>
        {showResults && hits.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {groupedHits.map((entry) => (
                <button
                  key={entry.type}
                  type="button"
                  onClick={() => setActiveType(entry.type)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                    visibleType === entry.type
                      ? "border-[#d7a45f] bg-[#d7a45f]/14 text-[#f5dfb8]"
                      : "border-white/12 bg-white/5 text-white/68 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {globalSearchLabels[entry.type]} ({entry.hits.length})
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-[#7b603b]/20 bg-[linear-gradient(180deg,rgba(35,30,27,0.86),rgba(18,20,24,0.84))] px-4 py-4 shadow-[0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur-md">
              <ul className="space-y-2">
                {pagedVisibleHits.map((hit) => (
                  <li key={hit.href} className="text-left text-sm text-[#e8dfcf]">
                    <Link href={hit.href} className="inline-flex items-center gap-2 font-medium hover:underline">
                      {hit.type === "item" && hit.icon ? <ItemIcon icon={hit.icon} name={hit.title} size="xs" tooltipItemId={Number(hit.id)} /> : null}
                      {hit.type === "spell" && hit.icon ? <SpellIcon icon={hit.icon} name={hit.title} /> : null}
                      <span>{hit.title}</span>
                    </Link>
                    {hit.subtitle || hit.tags.length > 0 ? (
                      <span className="ml-2 text-xs text-[#aa9d89]">
                        {[hit.subtitle, hit.tags.join(" • ")].filter(Boolean).join(" • ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            <PaginationControls
              currentPage={visiblePage}
              totalPages={totalPages}
              totalItems={visibleHits.length}
              pageSize={globalSearchResultsPerPage}
              onPageChange={setPage}
            />
          </div>
        ) : showResults ? (
          isFetching ? (
            <ClassLoadingIndicator message="Loading global search" detail="Sweeping items, spells, NPCs, and zones." />
          ) : activeQuery !== displayKey ? (
            <SearchPrompt message="Press Search to apply this query." />
          ) : (
            <SearchPrompt message="No archive entries matched this search." />
          )
        ) : (
          <SearchPrompt message="Enter a search term to search across items, spells, NPCs, zones, and more." />
        )}

        {resolvedTiming ? <p className="pt-1 text-right text-[11px] uppercase tracking-[0.16em] text-[#9f8e79]">{resolvedTiming}</p> : null}
      </SectionCard>
    </>
  );
}
