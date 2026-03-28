"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SpellSummary } from "@eq-alla/data";
import { Input } from "@eq-alla/ui";
import { ClassLoadingIndicator } from "../../components/class-loading-indicator";
import { SearchPrompt, SectionCard, SelectField, SimpleTable } from "../../components/catalog-shell";
import { SpellIcon } from "../../components/spell-icon";

type SpellSearchClientProps = {
  initialQuery: string;
  initialClassName: string;
  initialLevel: string;
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
};

type SpellCacheEntry = {
  expiresAt: number;
  results: SpellSummary[];
  touchedAt: number;
};

const spellSearchDebounceMs = 500;
const spellSearchAutoQueryMinLength = 3;
const spellSearchCacheTtlMs = 180_000;
const spellSearchCacheMaxEntries = 12;
const spellSearchSessionStorageKey = "eq-spell-search-cache";

const spellResultCache = new Map<string, SpellCacheEntry>();
let spellCacheHydrated = false;
const spellClassOptions = ["Bard", "Beastlord", "Berserker", "Cleric", "Druid", "Enchanter", "Magician", "Necromancer", "Paladin", "Ranger", "Rogue", "Shadow Knight", "Shaman", "Warrior", "Wizard"];
const spellLevelOptions = Array.from({ length: 65 }, (_, index) => String(index + 1));

function buildSearchParams(filters: SpellSearchFilters) {
  const params = new URLSearchParams();
  const query = filters.q.trim();
  if (query) params.set("q", query);
  if (filters.className) params.set("class", filters.className);
  if (filters.level) params.set("level", filters.level);
  return params;
}

function hasQuery(filters: SpellSearchFilters) {
  return filters.q.trim().length > 0;
}

function hasAutoSearchableQuery(filters: SpellSearchFilters) {
  return filters.q.trim().length >= spellSearchAutoQueryMinLength;
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

export function SpellSearchClient({ initialQuery, initialClassName, initialLevel }: SpellSearchClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<SpellSearchFilters>({
    q: initialQuery,
    className: initialClassName,
    level: initialLevel
  });
  const [results, setResults] = useState<SpellSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(hasQuery({ q: initialQuery, className: initialClassName, level: initialLevel }));
  const [displayKey, setDisplayKey] = useState("");
  const [resolutionMeta, setResolutionMeta] = useState<SearchResolutionMeta | null>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [awaitingManualSubmit, setAwaitingManualSubmit] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const currentUrlKeyRef = useRef(buildSearchParams({ q: initialQuery, className: initialClassName, level: initialLevel }).toString());
  const lastHandledSubmitRef = useRef(0);

  useEffect(() => {
    const key = buildSearchParams({ q: initialQuery, className: initialClassName, level: initialLevel }).toString();
    if (!key) return;
    const cached = getCachedSpells(key);
    if (!cached) return;
    setResults(cached);
    setDisplayKey(key);
    setIsFetching(false);
    setResolutionMeta({ key, durationMs: 0, source: "cache" });
  }, [initialClassName, initialLevel, initialQuery]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const setFilter = (key: keyof SpellSearchFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const submitSearch = () => {
    if (!hasQuery(filters)) return;
    setSubmitCount((current) => current + 1);
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

      if (!hasQuery(filters)) {
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
      const cached = getCachedSpells(nextKey);
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
          const response = await fetch(`/api/spells?${nextKey}`, { signal: controller.signal });
          if (!response.ok) throw new Error(`Search failed with ${response.status}`);
          const payload = (await response.json()) as { data?: SpellSummary[] };
          if (controller.signal.aborted) return;
          setResults(payload.data ?? []);
          setDisplayKey(nextKey);
          setCachedSpells(nextKey, payload.data ?? []);
          setResolutionMeta({ key: nextKey, durationMs: performance.now() - startedAt, source: "network" });
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
    }, isForcedSearch ? 0 : spellSearchDebounceMs);

    return () => window.clearTimeout(timer);
  }, [displayKey, filters, pathname, router, submitCount]);

  const activeQuery = filters.q.trim();
  const hasShortQuery = activeQuery.length > 0 && activeQuery.length < spellSearchAutoQueryMinLength;
  const showResults = activeQuery.length > 0 || isFetching || displayKey.includes("q=");
  const resultTitle = showResults ? (isFetching && results.length === 0 ? "Loading spells" : `${results.length} matching spells`) : "Results";
  const statusLabel = error ? error : isFetching ? "Refreshing results..." : "Search updates automatically";
  const resolvedTiming =
    resolutionMeta && resolutionMeta.key === displayKey && !isFetching
      ? `Loaded in ${formatDuration(resolutionMeta.durationMs)}${resolutionMeta.source === "cache" ? " from cache" : ""}`
      : null;

  return (
    <>
      <SectionCard title="Filters" right={<p className="text-xs font-medium text-[#ccb594]">{statusLabel}</p>}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Name</span>
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
              placeholder="Complete Heal..."
            />
          </label>
          <SelectField label="Class" name="class" defaultValue={filters.className} options={spellClassOptions} />
          <SelectField label="Level" name="level" defaultValue={filters.level} options={spellLevelOptions} />
        </div>
      </SectionCard>
      <SectionCard title={resultTitle}>
        {showResults && results.length > 0 ? (
          <SimpleTable
            columns={["Icon", "Name", "Class", "Effect(s)", "Mana", "Skill", "Target type"]}
            rows={results.map((spell) => [
              <SpellIcon key={`${spell.id}-icon`} icon={spell.icon} name={spell.name} />,
              <Link key={spell.id} href={`/spells/${spell.id}`} className="font-medium hover:underline">
                {spell.name}
              </Link>,
              spell.classLevel,
              spell.effect,
              spell.mana || "—",
              spell.skill,
              spell.target
            ])}
          />
        ) : showResults ? (
          isFetching ? (
            <ClassLoadingIndicator message="Loading spells" detail="Paging through the spell archive." />
          ) : awaitingManualSubmit && hasShortQuery ? (
            <SearchPrompt message={`Type ${spellSearchAutoQueryMinLength}+ characters to auto-search, or press Enter to search now.`} />
          ) : (
            <SearchPrompt message="No spells matched this search." />
          )
        ) : (
          <SearchPrompt message="Enter a spell name to load results." />
        )}
        {resolvedTiming ? <p className="pt-1 text-right text-[11px] uppercase tracking-[0.16em] text-[#9f8e79]">{resolvedTiming}</p> : null}
      </SectionCard>
    </>
  );
}
