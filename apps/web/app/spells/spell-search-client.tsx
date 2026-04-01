"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { SpellSummary } from "@eq-alla/data";
import { Button, Input } from "@eq-alla/ui";
import { ClassLoadingIndicator } from "../../components/class-loading-indicator";
import { PaginationControls, SearchPrompt, SectionCard, SelectField } from "../../components/catalog-shell";
import { SpellIcon } from "../../components/spell-icon";

type LevelMode = "exact" | "min" | "max";

type SpellSearchClientProps = {
  initialQuery: string;
  initialClassName: string;
  initialLevel: string;
  initialLevelMode: LevelMode;
  levelCap: number;
};

type SearchResolutionMeta = {
  key: string;
  durationMs: number;
  source: "network" | "cache";
};

type SpellSearchFilters = {
  q: string;
  className: string;
  level: string;
  levelMode: LevelMode;
};

type SpellCacheEntry = {
  expiresAt: number;
  results: SpellSummary[];
  touchedAt: number;
};

const spellResultsPerPage = 25;
const spellSearchCacheTtlMs = 180_000;
const spellSearchCacheMaxEntries = 12;
const spellSearchSessionStorageKey = "eq-spell-search-cache";

const spellResultCache = new Map<string, SpellCacheEntry>();
let spellCacheHydrated = false;
const spellClassOptions = ["Bard", "Beastlord", "Berserker", "Cleric", "Druid", "Enchanter", "Magician", "Necromancer", "Paladin", "Ranger", "Rogue", "Shadow Knight", "Shaman", "Warrior", "Wizard"];

function buildSearchParams(filters: SpellSearchFilters) {
  const params = new URLSearchParams();
  const query = filters.q.trim();
  if (query) params.set("q", query);
  if (filters.className) params.set("class", filters.className);
  if (filters.level) {
    params.set("level", filters.level);
    params.set("levelMode", filters.levelMode);
  }
  return params;
}

function hasActiveFilters(filters: SpellSearchFilters) {
  return filters.q.trim().length > 0 || filters.className.length > 0 || filters.level.length > 0;
}

function formatDuration(durationMs: number) {
  if (durationMs < 1_000) return `${Math.max(1, Math.round(durationMs))}ms`;
  return `${(durationMs / 1_000).toFixed(durationMs >= 10_000 ? 1 : 2)}s`;
}

function persistSpellCache() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(spellSearchSessionStorageKey, JSON.stringify(Object.fromEntries(spellResultCache.entries())));
  } catch {}
}

function pruneSpellCache(now = Date.now()) {
  for (const [key, entry] of spellResultCache.entries()) {
    if (entry.expiresAt < now) spellResultCache.delete(key);
  }
  if (spellResultCache.size <= spellSearchCacheMaxEntries) return;
  const oldest = [...spellResultCache.entries()]
    .sort((left, right) => left[1].touchedAt - right[1].touchedAt)
    .slice(0, spellResultCache.size - spellSearchCacheMaxEntries);
  for (const [key] of oldest) spellResultCache.delete(key);
}

function hydrateSpellCache() {
  if (spellCacheHydrated || typeof window === "undefined") return;
  spellCacheHydrated = true;
  const payload = window.sessionStorage.getItem(spellSearchSessionStorageKey);
  if (!payload) return;
  try {
    const parsed = JSON.parse(payload) as Record<string, SpellCacheEntry>;
    const now = Date.now();
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry && Array.isArray(entry.results) && typeof entry.expiresAt === "number") {
        spellResultCache.set(key, {
          expiresAt: entry.expiresAt,
          results: entry.results,
          touchedAt: typeof entry.touchedAt === "number" ? entry.touchedAt : now
        });
      }
    }
    pruneSpellCache(now);
    persistSpellCache();
  } catch {
    window.sessionStorage.removeItem(spellSearchSessionStorageKey);
  }
}

function getCachedSpells(key: string) {
  hydrateSpellCache();
  const entry = spellResultCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    spellResultCache.delete(key);
    persistSpellCache();
    return null;
  }
  entry.touchedAt = Date.now();
  return entry.results;
}

function setCachedSpells(key: string, results: SpellSummary[]) {
  hydrateSpellCache();
  spellResultCache.set(key, {
    expiresAt: Date.now() + spellSearchCacheTtlMs,
    results,
    touchedAt: Date.now()
  });
  pruneSpellCache();
  persistSpellCache();
}

function emptyFilters(): SpellSearchFilters {
  return {
    q: "",
    className: "",
    level: "",
    levelMode: "exact"
  };
}

function normalizeDisplaySkill(skill: string) {
  return skill.startsWith("Skill ") ? "—" : skill;
}

function normalizeDisplayEffect(effect: string) {
  return effect.startsWith("Effect ") ? "—" : effect;
}

function groupSpellsByLevel(results: SpellSummary[]) {
  const groups: Array<{ level: number; spells: SpellSummary[] }> = [];

  for (const spell of results) {
    const currentGroup = groups.at(-1);

    if (!currentGroup || currentGroup.level !== spell.level) {
      groups.push({ level: spell.level, spells: [spell] });
      continue;
    }

    currentGroup.spells.push(spell);
  }

  return groups;
}

const spellTableColumns = ["Name", "Class", "Effect(s)", "Mana", "Skill", "Target Type", "Spell ID"] as const;

function SpellTableHeaderRow({ repeated = false }: { repeated?: boolean }) {
  return (
    <tr className={repeated ? "border-t border-white/10 bg-[linear-gradient(180deg,rgba(215,164,95,0.05),rgba(255,255,255,0.015))] text-[#ccb594]" : undefined}>
      {spellTableColumns.map((label) => (
        <th
          key={label}
          scope="col"
          className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em]"
        >
          {label}
        </th>
      ))}
    </tr>
  );
}

export function SpellSearchClient({ initialQuery, initialClassName, initialLevel, initialLevelMode, levelCap }: SpellSearchClientProps) {
  const pathname = usePathname();
  const initialFilters: SpellSearchFilters = {
    q: initialQuery,
    className: initialClassName,
    level: initialLevel,
    levelMode: initialLevelMode
  };
  const spellLevelOptions = Array.from({ length: levelCap }, (_, index) => String(index + 1));

  const [filters, setFilters] = useState<SpellSearchFilters>(initialFilters);
  const [results, setResults] = useState<SpellSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [displayKey, setDisplayKey] = useState("");
  const [resolutionMeta, setResolutionMeta] = useState<SearchResolutionMeta | null>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [page, setPage] = useState(1);
  const abortRef = useRef<AbortController | null>(null);
  const currentUrlKeyRef = useRef(buildSearchParams(initialFilters).toString());
  const lastHandledSubmitRef = useRef(0);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const nextFilters: SpellSearchFilters = {
      q: initialQuery,
      className: initialClassName,
      level: initialLevel,
      levelMode: initialLevelMode
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
  }, [initialClassName, initialLevel, initialLevelMode, initialQuery]);

  const setFilter = (key: keyof SpellSearchFilters, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
  };

  const submitSearch = () => {
    setSubmitCount((current) => current + 1);
  };

  const resetSearch = () => {
    abortRef.current?.abort();
    const nextFilters = emptyFilters();
    setFilters(nextFilters);
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
    const cached = getCachedSpells(nextKey);
    if (cached) {
      setResults(cached);
      setDisplayKey(nextKey);
      setError(null);
      setIsFetching(false);
      setResolutionMeta({ key: nextKey, durationMs: performance.now() - startedAt, source: "cache" });
      setPage(1);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsFetching(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/spells?${nextKey}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Search failed with ${response.status}`);
        const payload = (await response.json()) as { data?: SpellSummary[] };
        if (controller.signal.aborted) return;
        const nextResults = payload.data ?? [];
        setResults(nextResults);
        setDisplayKey(nextKey);
        setCachedSpells(nextKey, nextResults);
        setResolutionMeta({ key: nextKey, durationMs: performance.now() - startedAt, source: "network" });
        setPage(1);
      } catch (searchError) {
        if (controller.signal.aborted) return;
        console.error(searchError);
        setError("Could not refresh spell results. Showing the last successful search.");
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsFetching(false);
        }
      }
    })();
  }, [filters, pathname, submitCount]);

  const totalPages = Math.max(1, Math.ceil(results.length / spellResultsPerPage));
  const visiblePage = Math.min(page, totalPages);
  const pagedResults = results.slice((visiblePage - 1) * spellResultsPerPage, visiblePage * spellResultsPerPage);
  const groupedResults = filters.className ? groupSpellsByLevel(pagedResults) : [];
  const draftKey = buildSearchParams(filters).toString();
  const showResults = hasActiveFilters(filters) || isFetching || displayKey.length > 0;
  const resultTitle = showResults ? (isFetching && results.length === 0 ? "Loading spells" : `${results.length} matching spells`) : "Results";
  const statusLabel = error ? error : isFetching ? "Refreshing results..." : draftKey === displayKey && displayKey ? "Filters applied" : "Press Search to apply filters";
  const resolvedTiming =
    resolutionMeta && resolutionMeta.key === displayKey && !isFetching
      ? `Loaded in ${formatDuration(resolutionMeta.durationMs)}${resolutionMeta.source === "cache" ? " from cache" : ""}`
      : null;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <>
      <SectionCard title="Filters" right={<p className="text-xs font-medium text-[#ccb594]">{statusLabel}</p>}>
        <div className="grid gap-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <label className="grid gap-2 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Search For</span>
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
                placeholder="Flame"
              />
            </label>
            <p className="pb-1 text-sm italic text-white/70">Searches name, description, and casting messages.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,220px)_minmax(0,220px)_1fr]">
            <SelectField label="Class" name="class" value={filters.className} onChange={(value) => setFilter("className", value)} options={spellClassOptions} />
            <SelectField label="Level" name="level" value={filters.level} onChange={(value) => setFilter("level", value)} options={spellLevelOptions} />
            <fieldset className="grid gap-2 text-sm">
              <legend className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Level Match</legend>
              <div className="flex flex-wrap gap-4 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                <label className="flex items-center gap-2 text-white/85">
                  <input type="radio" name="levelMode" checked={filters.levelMode === "exact"} onChange={() => setFilter("levelMode", "exact")} />
                  <span>Only</span>
                </label>
                <label className="flex items-center gap-2 text-white/85">
                  <input type="radio" name="levelMode" checked={filters.levelMode === "min"} onChange={() => setFilter("levelMode", "min")} />
                  <span>And Higher</span>
                </label>
                <label className="flex items-center gap-2 text-white/85">
                  <input type="radio" name="levelMode" checked={filters.levelMode === "max"} onChange={() => setFilter("levelMode", "max")} />
                  <span>And Lower</span>
                </label>
              </div>
            </fieldset>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={submitSearch}>
              Search
            </Button>
            <Button type="button" variant="outline" onClick={resetSearch}>
              Reset
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={resultTitle}>
        {showResults && results.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-2xl border border-[#7b603b]/20 bg-[linear-gradient(180deg,rgba(35,30,27,0.86),rgba(18,20,24,0.84))] shadow-[0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur-md">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-[linear-gradient(180deg,rgba(215,164,95,0.08),rgba(255,255,255,0.02))] text-[#ccb594]">
                  <SpellTableHeaderRow />
                </thead>
                <tbody>
                  {(filters.className ? groupedResults.flatMap((group) => [{ isLevelHeader: true as const, level: group.level }, ...group.spells]) : pagedResults).map(
                    (entry, index) =>
                      "isLevelHeader" in entry ? (
                        <Fragment key={`level-${entry.level}-${index}`}>
                          <tr className="border-t border-white/10 bg-[#d7a45f]/10">
                            <td colSpan={7} className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-[#f5dfb8]">
                              Level {entry.level}
                            </td>
                          </tr>
                          <SpellTableHeaderRow repeated />
                        </Fragment>
                      ) : (
                        <tr
                          key={entry.id}
                          className="border-t border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.008))] transition hover:bg-[linear-gradient(180deg,rgba(215,164,95,0.075),rgba(255,255,255,0.02))]"
                        >
                          <td className="px-4 py-3.5 align-top text-[#e8dfcf]">
                            <div className="flex items-start gap-4">
                              <SpellIcon icon={entry.icon} name={entry.name} size="md" />
                              <Link href={`/spells/${entry.id}`} className="font-medium hover:underline">
                                {entry.name}
                              </Link>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-top text-[#e8dfcf]">{filters.className || entry.className || "—"}</td>
                          <td className="px-4 py-3.5 align-top text-[#e8dfcf]">{normalizeDisplayEffect(entry.effect)}</td>
                          <td className="px-4 py-3.5 align-top text-[#e8dfcf]">{entry.mana || 0}</td>
                          <td className="px-4 py-3.5 align-top text-[#e8dfcf]">{normalizeDisplaySkill(entry.skill)}</td>
                          <td className="px-4 py-3.5 align-top text-[#e8dfcf]">{entry.target}</td>
                          <td className="px-4 py-3.5 align-top text-[#e8dfcf]">{entry.id}</td>
                        </tr>
                      )
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls
              currentPage={visiblePage}
              totalPages={totalPages}
              totalItems={results.length}
              pageSize={spellResultsPerPage}
              onPageChange={setPage}
            />
          </>
        ) : showResults ? (
          isFetching ? (
            <ClassLoadingIndicator message="Loading spells" detail="Paging through the spell archive." />
          ) : (
            <SearchPrompt message="No spells matched this search." />
          )
        ) : (
          <SearchPrompt message="Enter a spell name or browse by class and level." />
        )}
        {resolvedTiming ? <p className="pt-1 text-right text-[11px] uppercase tracking-[0.16em] text-[#9f8e79]">{resolvedTiming}</p> : null}
      </SectionCard>
    </>
  );
}
