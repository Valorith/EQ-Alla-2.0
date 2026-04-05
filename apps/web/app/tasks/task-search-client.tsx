"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { TaskDetail } from "@eq-alla/data";
import { Button, Input } from "@eq-alla/ui";
import { ClassLoadingIndicator } from "../../components/class-loading-indicator";
import { PaginationControls, SearchPrompt, SectionCard, SimpleTable } from "../../components/catalog-shell";
import { waitForLoadingIndicator } from "../../components/loading-state";

type TaskSearchClientProps = {
  initialQuery: string;
};

type SearchResolutionMeta = {
  key: string;
  durationMs: number;
  source: "network" | "cache";
};

type TaskCacheEntry = {
  expiresAt: number;
  results: TaskDetail[];
  touchedAt: number;
};

const taskResultsPerPage = 20;
const taskSearchCacheTtlMs = 180_000;
const taskSearchCacheMaxEntries = 12;
const taskSearchSessionStorageKey = "eq-task-search-cache";

const taskResultCache = new Map<string, TaskCacheEntry>();
let taskCacheHydrated = false;

function buildSearchKey(query: string) {
  return query.trim();
}

function hasQuery(query: string) {
  return buildSearchKey(query).length > 0;
}

function formatDuration(durationMs: number) {
  if (durationMs < 1_000) return `${Math.max(1, Math.round(durationMs))}ms`;
  return `${(durationMs / 1_000).toFixed(durationMs >= 10_000 ? 1 : 2)}s`;
}

function persistTaskCache() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(taskSearchSessionStorageKey, JSON.stringify(Object.fromEntries(taskResultCache.entries())));
  } catch {}
}

function pruneTaskCache(now = Date.now()) {
  for (const [key, entry] of taskResultCache.entries()) {
    if (entry.expiresAt < now) taskResultCache.delete(key);
  }
  if (taskResultCache.size <= taskSearchCacheMaxEntries) return;
  const oldest = [...taskResultCache.entries()]
    .sort((left, right) => left[1].touchedAt - right[1].touchedAt)
    .slice(0, taskResultCache.size - taskSearchCacheMaxEntries);
  for (const [key] of oldest) taskResultCache.delete(key);
}

function hydrateTaskCache() {
  if (taskCacheHydrated || typeof window === "undefined") return;
  taskCacheHydrated = true;
  const payload = window.sessionStorage.getItem(taskSearchSessionStorageKey);
  if (!payload) return;
  try {
    const parsed = JSON.parse(payload) as Record<string, TaskCacheEntry>;
    const now = Date.now();
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry && Array.isArray(entry.results) && typeof entry.expiresAt === "number") {
        taskResultCache.set(key, {
          expiresAt: entry.expiresAt,
          results: entry.results,
          touchedAt: typeof entry.touchedAt === "number" ? entry.touchedAt : now
        });
      }
    }
    pruneTaskCache(now);
    persistTaskCache();
  } catch {
    window.sessionStorage.removeItem(taskSearchSessionStorageKey);
  }
}

function getCachedTasks(key: string) {
  hydrateTaskCache();
  const entry = taskResultCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    taskResultCache.delete(key);
    persistTaskCache();
    return null;
  }
  entry.touchedAt = Date.now();
  return entry.results;
}

function setCachedTasks(key: string, results: TaskDetail[]) {
  hydrateTaskCache();
  taskResultCache.set(key, {
    expiresAt: Date.now() + taskSearchCacheTtlMs,
    results,
    touchedAt: Date.now()
  });
  pruneTaskCache();
  persistTaskCache();
}

export function TaskSearchClient({ initialQuery }: TaskSearchClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<TaskDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [displayKey, setDisplayKey] = useState("");
  const [resolutionMeta, setResolutionMeta] = useState<SearchResolutionMeta | null>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [page, setPage] = useState(1);
  const abortRef = useRef<AbortController | null>(null);
  const currentUrlKeyRef = useRef(buildSearchKey(initialQuery));
  const lastHandledSubmitRef = useRef(0);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const nextKey = buildSearchKey(initialQuery);

    setQuery(initialQuery);
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
  }, [initialQuery]);

  const submitSearch = () => {
    if (!hasQuery(query)) return;

    const nextKey = buildSearchKey(query);
    const nextHref = nextKey ? `${pathname}?q=${encodeURIComponent(nextKey)}` : pathname;

    if (nextKey !== currentUrlKeyRef.current) {
      currentUrlKeyRef.current = nextKey;
      router.replace(nextHref, { scroll: false });
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
    }
    abortRef.current?.abort();

    if (!nextKey) {
      setResults([]);
      setError(null);
      setDisplayKey("");
      setIsFetching(false);
      setResolutionMeta(null);
      return;
    }

    const startedAt = performance.now();
    setIsFetching(true);
    setError(null);

    const cached = getCachedTasks(nextKey);
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
        const response = await fetch(`/api/tasks?q=${encodeURIComponent(nextKey)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Search failed with ${response.status}`);
        const payload = (await response.json()) as { data?: TaskDetail[] };
        if (controller.signal.aborted) return;
        setResults(payload.data ?? []);
        setDisplayKey(nextKey);
        setCachedTasks(nextKey, payload.data ?? []);
        setResolutionMeta({ key: nextKey, durationMs: performance.now() - startedAt, source: "network" });
      } catch (searchError) {
        if (controller.signal.aborted) return;
        console.error(searchError);
        setError("Could not refresh task results. Showing the last successful search.");
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          await waitForLoadingIndicator(startedAt);
          setIsFetching(false);
        }
      }
    })();
  }, [pathname, query, submitCount]);

  const activeQuery = buildSearchKey(query);
  const totalPages = Math.max(1, Math.ceil(results.length / taskResultsPerPage));
  const visiblePage = Math.min(page, totalPages);
  const pagedResults = results.slice((visiblePage - 1) * taskResultsPerPage, visiblePage * taskResultsPerPage);
  const showResults = activeQuery.length > 0 || isFetching || displayKey.length > 0;
  const resultTitle = showResults ? (isFetching && results.length === 0 ? "Loading tasks" : `${results.length} tasks`) : "Results";
  const statusLabel = error ? error : isFetching ? "Refreshing results..." : activeQuery === displayKey && displayKey ? "Filters applied" : "Press Search to apply filters";
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
            placeholder="Ledger..."
          />
          <Button type="button" onClick={submitSearch}>
            Search
          </Button>
        </div>
      </SectionCard>
      <SectionCard title={resultTitle}>
        <div className="relative">
          {showResults && results.length > 0 ? (
            <div className={isFetching ? "transition duration-200 opacity-40 blur-[2px]" : undefined}>
              <SimpleTable
                columns={["Task", "Zone", "Levels", "Reward"]}
                rows={pagedResults.map((task) => [
                  <Link key={task.id} href={`/tasks/${task.id}`} className="font-medium hover:underline">
                    {task.title}
                  </Link>,
                  task.zone.longName,
                  task.levelRange,
                  task.reward
                ])}
              />
              <PaginationControls
                currentPage={visiblePage}
                totalPages={totalPages}
                totalItems={results.length}
                pageSize={taskResultsPerPage}
                onPageChange={setPage}
              />
            </div>
          ) : showResults ? (
            isFetching ? (
              <ClassLoadingIndicator message="Loading tasks" detail="Reviewing quests, zones, and rewards." />
            ) : activeQuery !== displayKey ? (
              <SearchPrompt message="Press Search to apply this query." />
            ) : (
              <SearchPrompt message="No tasks matched this search." />
            )
          ) : (
            <SearchPrompt message="Enter a task name to load results." />
          )}

          {isFetching && results.length > 0 ? (
            <ClassLoadingIndicator overlay message="Loading tasks" detail="Reviewing quests, zones, and rewards." />
          ) : null}
        </div>
        {resolvedTiming ? <p className="pt-1 text-right text-[11px] uppercase tracking-[0.16em] text-[#9f8e79]">{resolvedTiming}</p> : null}
      </SectionCard>
    </>
  );
}
