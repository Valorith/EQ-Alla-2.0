"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { TaskDetail } from "@eq-alla/data";
import { Button, Input } from "@eq-alla/ui";
import { ClassLoadingIndicator } from "../../components/class-loading-indicator";
import { PaginationControls, SearchPrompt, SectionCard, SimpleTable } from "../../components/catalog-shell";

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

const taskSearchDebounceMs = 500;
const taskSearchAutoQueryMinLength = 3;
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

function hasAutoSearchableQuery(query: string) {
  return buildSearchKey(query).length >= taskSearchAutoQueryMinLength;
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
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<TaskDetail[]>([]);
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
    const cached = getCachedTasks(key);
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
      const cached = getCachedTasks(nextKey);
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
            setIsFetching(false);
          }
        }
      })();
    }, isForcedSearch ? 0 : taskSearchDebounceMs);

    return () => window.clearTimeout(timer);
  }, [displayKey, pathname, query, router, submitCount]);

  const activeQuery = buildSearchKey(query);
  const totalPages = Math.max(1, Math.ceil(results.length / taskResultsPerPage));
  const visiblePage = Math.min(page, totalPages);
  const pagedResults = results.slice((visiblePage - 1) * taskResultsPerPage, visiblePage * taskResultsPerPage);
  const hasShortQuery = activeQuery.length > 0 && activeQuery.length < taskSearchAutoQueryMinLength;
  const showResults = activeQuery.length > 0 || isFetching || displayKey.length > 0;
  const resultTitle = showResults ? (isFetching && results.length === 0 ? "Loading tasks" : `${results.length} tasks`) : "Results";
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
            placeholder="Ledger..."
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
          </>
        ) : showResults ? (
          isFetching ? (
            <ClassLoadingIndicator message="Loading tasks" detail="Reviewing quests, zones, and rewards." />
          ) : awaitingManualSubmit && hasShortQuery ? (
            <SearchPrompt message={`Type ${taskSearchAutoQueryMinLength}+ characters to auto-search, or press Enter to search now.`} />
          ) : (
            <SearchPrompt message="No tasks matched this search." />
          )
        ) : (
          <SearchPrompt message="Enter a task name to load results." />
        )}
        {resolvedTiming ? <p className="pt-1 text-right text-[11px] uppercase tracking-[0.16em] text-[#9f8e79]">{resolvedTiming}</p> : null}
      </SectionCard>
    </>
  );
}
