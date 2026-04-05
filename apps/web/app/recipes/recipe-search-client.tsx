"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { RecipeSummary } from "@eq-alla/data";
import { Button, Input } from "@eq-alla/ui";
import { ClassLoadingIndicator } from "../../components/class-loading-indicator";
import { PaginationControls, SearchPrompt, SectionCard, SelectField, SimpleTable } from "../../components/catalog-shell";
import { waitForLoadingIndicator } from "../../components/loading-state";

type RecipeSearchClientProps = {
  initialQuery: string;
  initialTradeskill: string;
  initialMinTrivial: string;
  initialMaxTrivial: string;
};

type RecipeFilters = {
  q: string;
  tradeskill: string;
  minTrivial: string;
  maxTrivial: string;
};

type SearchResolutionMeta = {
  key: string;
  durationMs: number;
  source: "network" | "cache";
};

type RecipeCacheEntry = {
  expiresAt: number;
  results: RecipeSummary[];
  touchedAt: number;
};

const recipeResultsPerPage = 25;
const recipeSearchCacheTtlMs = 180_000;
const recipeSearchCacheMaxEntries = 12;
const recipeSearchSessionStorageKey = "eq-recipe-search-cache";

const recipeResultCache = new Map<string, RecipeCacheEntry>();
let recipeCacheHydrated = false;
const recipeTradeskillOptions = ["Alchemy", "Baking", "Blacksmithing", "Brewing", "Fishing", "Fletching", "Jewelry", "Poison", "Pottery", "Research", "Tailoring", "Tinkering"];

function buildSearchParams(filters: RecipeFilters) {
  const params = new URLSearchParams();
  const query = filters.q.trim();
  if (query) params.set("q", query);
  if (filters.tradeskill) params.set("tradeskill", filters.tradeskill);
  if (filters.minTrivial) params.set("minTrivial", filters.minTrivial);
  if (filters.maxTrivial) params.set("maxTrivial", filters.maxTrivial);
  return params;
}

function hasQuery(filters: RecipeFilters) {
  return filters.q.trim().length > 0 || filters.tradeskill.length > 0 || filters.minTrivial.length > 0 || filters.maxTrivial.length > 0;
}

function formatDuration(durationMs: number) {
  if (durationMs < 1_000) return `${Math.max(1, Math.round(durationMs))}ms`;
  return `${(durationMs / 1_000).toFixed(durationMs >= 10_000 ? 1 : 2)}s`;
}

function persistRecipeCache() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(recipeSearchSessionStorageKey, JSON.stringify(Object.fromEntries(recipeResultCache.entries())));
  } catch {}
}

function pruneRecipeCache(now = Date.now()) {
  for (const [key, entry] of recipeResultCache.entries()) {
    if (entry.expiresAt < now) recipeResultCache.delete(key);
  }
  if (recipeResultCache.size <= recipeSearchCacheMaxEntries) return;
  const oldest = [...recipeResultCache.entries()]
    .sort((left, right) => left[1].touchedAt - right[1].touchedAt)
    .slice(0, recipeResultCache.size - recipeSearchCacheMaxEntries);
  for (const [key] of oldest) recipeResultCache.delete(key);
}

function hydrateRecipeCache() {
  if (recipeCacheHydrated || typeof window === "undefined") return;
  recipeCacheHydrated = true;
  const payload = window.sessionStorage.getItem(recipeSearchSessionStorageKey);
  if (!payload) return;
  try {
    const parsed = JSON.parse(payload) as Record<string, RecipeCacheEntry>;
    const now = Date.now();
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry && Array.isArray(entry.results) && typeof entry.expiresAt === "number") {
        recipeResultCache.set(key, {
          expiresAt: entry.expiresAt,
          results: entry.results,
          touchedAt: typeof entry.touchedAt === "number" ? entry.touchedAt : now
        });
      }
    }
    pruneRecipeCache(now);
    persistRecipeCache();
  } catch {
    window.sessionStorage.removeItem(recipeSearchSessionStorageKey);
  }
}

function getCachedRecipes(key: string) {
  hydrateRecipeCache();
  const entry = recipeResultCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    recipeResultCache.delete(key);
    persistRecipeCache();
    return null;
  }
  entry.touchedAt = Date.now();
  return entry.results;
}

function setCachedRecipes(key: string, results: RecipeSummary[]) {
  hydrateRecipeCache();
  recipeResultCache.set(key, {
    expiresAt: Date.now() + recipeSearchCacheTtlMs,
    results,
    touchedAt: Date.now()
  });
  pruneRecipeCache();
  persistRecipeCache();
}

export function RecipeSearchClient({ initialQuery, initialTradeskill, initialMinTrivial, initialMaxTrivial }: RecipeSearchClientProps) {
  const pathname = usePathname();
  const [filters, setFilters] = useState<RecipeFilters>({
    q: initialQuery,
    tradeskill: initialTradeskill,
    minTrivial: initialMinTrivial,
    maxTrivial: initialMaxTrivial
  });
  const [results, setResults] = useState<RecipeSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [displayKey, setDisplayKey] = useState("");
  const [resolutionMeta, setResolutionMeta] = useState<SearchResolutionMeta | null>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [page, setPage] = useState(1);
  const abortRef = useRef<AbortController | null>(null);
  const currentUrlKeyRef = useRef(
    buildSearchParams({ q: initialQuery, tradeskill: initialTradeskill, minTrivial: initialMinTrivial, maxTrivial: initialMaxTrivial }).toString()
  );
  const lastHandledSubmitRef = useRef(0);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const nextFilters: RecipeFilters = {
      q: initialQuery,
      tradeskill: initialTradeskill,
      minTrivial: initialMinTrivial,
      maxTrivial: initialMaxTrivial
    };
    const nextKey = buildSearchParams(nextFilters).toString();

    setFilters(nextFilters);
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
  }, [initialMaxTrivial, initialMinTrivial, initialQuery, initialTradeskill]);

  const setFilter = (key: keyof RecipeFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const submitSearch = () => {
    if (!hasQuery(filters)) return;
    setSubmitCount((current) => current + 1);
  };

  const clearFilters = () => {
    abortRef.current?.abort();
    setFilters({
      q: "",
      tradeskill: "",
      minTrivial: "",
      maxTrivial: ""
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
    const nextKey = buildSearchParams(filters).toString();
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

    const cached = getCachedRecipes(nextKey);
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
        const response = await fetch(`/api/recipes?${nextKey}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Search failed with ${response.status}`);
        const payload = (await response.json()) as { data?: RecipeSummary[] };
        if (controller.signal.aborted) return;
        setResults(payload.data ?? []);
        setDisplayKey(nextKey);
        setCachedRecipes(nextKey, payload.data ?? []);
        setResolutionMeta({ key: nextKey, durationMs: performance.now() - startedAt, source: "network" });
      } catch (searchError) {
        if (controller.signal.aborted) return;
        console.error(searchError);
        setError("Could not refresh recipe results. Showing the last successful search.");
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          await waitForLoadingIndicator(startedAt);
          setIsFetching(false);
        }
      }
    })();
  }, [filters, pathname, submitCount]);

  const totalPages = Math.max(1, Math.ceil(results.length / recipeResultsPerPage));
  const visiblePage = Math.min(page, totalPages);
  const pagedResults = results.slice((visiblePage - 1) * recipeResultsPerPage, visiblePage * recipeResultsPerPage);
  const showResults = hasQuery(filters) || isFetching || displayKey.length > 0;
  const resultTitle = showResults ? (isFetching && results.length === 0 ? "Loading recipes" : `${results.length} recipes`) : "Results";
  const statusLabel = error ? error : isFetching ? "Refreshing results..." : buildSearchParams(filters).toString() === displayKey && displayKey ? "Filters applied" : "Press Search to apply filters";
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
      <SectionCard title="Filters" right={<p className="text-xs font-medium text-[#ccb594]">{statusLabel}</p>}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Recipe</span>
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
              placeholder="Traveler's Kit..."
            />
          </label>
          <SelectField
            label="Tradeskill"
            name="tradeskill"
            value={filters.tradeskill}
            onChange={(value) => setFilter("tradeskill", value)}
            options={recipeTradeskillOptions}
          />
          <label className="grid gap-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Min trivial skill</span>
            <Input name="minTrivial" value={filters.minTrivial} onChange={(event) => setFilter("minTrivial", event.target.value)} placeholder="0" />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Max trivial skill</span>
            <Input name="maxTrivial" value={filters.maxTrivial} onChange={(event) => setFilter("maxTrivial", event.target.value)} placeholder="0" />
          </label>
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
                columns={["Recipe", "Recipe ID", "Tradeskill", "Trivial at skill level"]}
                rows={pagedResults.map((recipe) => [
                  <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="font-medium hover:underline">
                    {recipe.name}
                  </Link>,
                  recipe.id,
                  recipe.tradeskill,
                  recipe.trivial
                ])}
              />
              <PaginationControls
                currentPage={visiblePage}
                totalPages={totalPages}
                totalItems={results.length}
                pageSize={recipeResultsPerPage}
                onPageChange={setPage}
              />
            </div>
          ) : showResults ? (
            isFetching ? (
              <ClassLoadingIndicator message="Loading recipes" detail="Sifting ingredients, trivials, and results." />
            ) : buildSearchParams(filters).toString() !== displayKey ? (
              <SearchPrompt message="Press Search to apply these filters." />
            ) : (
              <SearchPrompt message="No recipes matched this search." />
            )
          ) : (
            <SearchPrompt message="Enter a recipe name to load results." />
          )}

          {isFetching && results.length > 0 ? (
            <ClassLoadingIndicator overlay message="Loading recipes" detail="Sifting ingredients, trivials, and results." />
          ) : null}
        </div>
        {resolvedTiming ? <p className="pt-1 text-right text-[11px] uppercase tracking-[0.16em] text-[#9f8e79]">{resolvedTiming}</p> : null}
      </SectionCard>
    </>
  );
}
