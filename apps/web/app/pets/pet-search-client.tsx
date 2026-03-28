"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { PetSummary } from "@eq-alla/data";
import { Button } from "@eq-alla/ui";
import { ClassLoadingIndicator } from "../../components/class-loading-indicator";
import { SearchPrompt, SectionCard, SelectField, SimpleTable } from "../../components/catalog-shell";
import { SpellIcon } from "../../components/spell-icon";

type PetSearchClientProps = {
  initialClassName: string;
};

type SearchResolutionMeta = {
  key: string;
  durationMs: number;
  source: "network" | "cache";
};

type PetCacheEntry = {
  expiresAt: number;
  results: PetSummary[];
  touchedAt: number;
};

const petSearchDebounceMs = 300;
const petSearchCacheTtlMs = 180_000;
const petSearchCacheMaxEntries = 12;
const petSearchSessionStorageKey = "eq-pet-search-cache";
const petClassOptions = ["Beastlord", "Cleric", "Druid", "Enchanter", "Magician", "Necromancer", "Shadow Knight", "Shaman", "Wizard"];

const petResultCache = new Map<string, PetCacheEntry>();
let petCacheHydrated = false;

function buildSearchKey(className: string) {
  return className.trim();
}

function hasQuery(className: string) {
  return buildSearchKey(className).length > 0;
}

function formatDuration(durationMs: number) {
  if (durationMs < 1_000) return `${Math.max(1, Math.round(durationMs))}ms`;
  return `${(durationMs / 1_000).toFixed(durationMs >= 10_000 ? 1 : 2)}s`;
}

function persistPetCache() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(petSearchSessionStorageKey, JSON.stringify(Object.fromEntries(petResultCache.entries())));
  } catch {}
}

function prunePetCache(now = Date.now()) {
  for (const [key, entry] of petResultCache.entries()) {
    if (entry.expiresAt < now) petResultCache.delete(key);
  }
  if (petResultCache.size <= petSearchCacheMaxEntries) return;
  const oldest = [...petResultCache.entries()]
    .sort((left, right) => left[1].touchedAt - right[1].touchedAt)
    .slice(0, petResultCache.size - petSearchCacheMaxEntries);
  for (const [key] of oldest) petResultCache.delete(key);
}

function hydratePetCache() {
  if (petCacheHydrated || typeof window === "undefined") return;
  petCacheHydrated = true;
  const payload = window.sessionStorage.getItem(petSearchSessionStorageKey);
  if (!payload) return;
  try {
    const parsed = JSON.parse(payload) as Record<string, PetCacheEntry>;
    const now = Date.now();
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry && Array.isArray(entry.results) && typeof entry.expiresAt === "number") {
        petResultCache.set(key, {
          expiresAt: entry.expiresAt,
          results: entry.results,
          touchedAt: typeof entry.touchedAt === "number" ? entry.touchedAt : now
        });
      }
    }
    prunePetCache(now);
    persistPetCache();
  } catch {
    window.sessionStorage.removeItem(petSearchSessionStorageKey);
  }
}

function getCachedPets(key: string) {
  hydratePetCache();
  const entry = petResultCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    petResultCache.delete(key);
    persistPetCache();
    return null;
  }
  entry.touchedAt = Date.now();
  return entry.results;
}

function setCachedPets(key: string, results: PetSummary[]) {
  hydratePetCache();
  petResultCache.set(key, {
    expiresAt: Date.now() + petSearchCacheTtlMs,
    results,
    touchedAt: Date.now()
  });
  prunePetCache();
  persistPetCache();
}

export function PetSearchClient({ initialClassName }: PetSearchClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [className, setClassName] = useState(initialClassName);
  const [results, setResults] = useState<PetSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(hasQuery(initialClassName));
  const [displayKey, setDisplayKey] = useState("");
  const [resolutionMeta, setResolutionMeta] = useState<SearchResolutionMeta | null>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const currentUrlKeyRef = useRef(buildSearchKey(initialClassName));
  const lastHandledSubmitRef = useRef(0);

  useEffect(() => {
    const key = buildSearchKey(initialClassName);
    if (!key) return;
    const cached = getCachedPets(key);
    if (!cached) return;
    setResults(cached);
    setDisplayKey(key);
    setIsFetching(false);
    setResolutionMeta({ key, durationMs: 0, source: "cache" });
  }, [initialClassName]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const submitSearch = () => {
    if (!hasQuery(className)) return;
    setSubmitCount((current) => current + 1);
  };

  useEffect(() => {
    const isForcedSearch = submitCount !== lastHandledSubmitRef.current;
    const timer = window.setTimeout(() => {
      if (isForcedSearch) lastHandledSubmitRef.current = submitCount;
      const nextKey = buildSearchKey(className);
      const nextHref = nextKey ? `${pathname}?class=${encodeURIComponent(nextKey)}` : pathname;
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
        return;
      }

      const startedAt = performance.now();
      const cached = getCachedPets(nextKey);
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
          const response = await fetch(`/api/pets?class=${encodeURIComponent(nextKey)}`, { signal: controller.signal });
          if (!response.ok) throw new Error(`Search failed with ${response.status}`);
          const payload = (await response.json()) as { data?: PetSummary[] };
          if (controller.signal.aborted) return;
          setResults(payload.data ?? []);
          setDisplayKey(nextKey);
          setCachedPets(nextKey, payload.data ?? []);
          setResolutionMeta({ key: nextKey, durationMs: performance.now() - startedAt, source: "network" });
        } catch (searchError) {
          if (controller.signal.aborted) return;
          console.error(searchError);
          setError("Could not refresh pet results. Showing the last successful search.");
        } finally {
          if (abortRef.current === controller) {
            abortRef.current = null;
            setIsFetching(false);
          }
        }
      })();
    }, hasQuery(className) ? (submitCount === 0 ? petSearchDebounceMs : 0) : 0);

    return () => window.clearTimeout(timer);
  }, [className, displayKey, pathname, router, submitCount]);

  const showResults = hasQuery(className) || isFetching || displayKey.length > 0;
  const resultTitle = showResults ? (isFetching && results.length === 0 ? "Loading pets" : `${results.length} pets`) : "Results";
  const statusLabel = error ? error : isFetching ? "Refreshing results..." : "Search updates automatically";
  const resolvedTiming =
    resolutionMeta && resolutionMeta.key === displayKey && !isFetching
      ? `Loaded in ${formatDuration(resolutionMeta.durationMs)}${resolutionMeta.source === "cache" ? " from cache" : ""}`
      : null;

  return (
    <>
      <SectionCard title="Choose a class" right={<p className="text-xs font-medium text-[#ccb594]">{statusLabel}</p>}>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
          <SelectField label="Class" name="class" value={className} onChange={setClassName} options={petClassOptions} />
          <div className="flex items-end">
            <Button type="button" variant="outline" className="w-full" onClick={() => setClassName("")}>
              Clear
            </Button>
          </div>
        </div>
      </SectionCard>
      <SectionCard title={resultTitle}>
        {showResults && results.length > 0 ? (
          <SimpleTable
            columns={["Level", "Icon", "Spell name", "Details", "Race", "Pet level", "Pet class", "HP", "Mana", "AC", "Min damage", "Max damage"]}
            rows={results.map((pet) => [
              pet.spellLevel,
              <SpellIcon key={`${pet.id}-icon`} icon={pet.spellIcon} name={pet.spellName} />,
              <Link key={`${pet.id}-spell`} href={`/spells/${pet.spellId}`} className="font-medium hover:underline">
                {pet.spellName}
              </Link>,
              <Link key={`${pet.id}-detail`} href={`/pets/${pet.id}`} className="font-medium hover:underline">
                View
              </Link>,
              pet.race,
              pet.petLevel,
              pet.petClass,
              pet.hp,
              pet.mana,
              pet.ac,
              pet.minDamage,
              pet.maxDamage
            ])}
          />
        ) : showResults ? (
          isFetching ? (
            <ClassLoadingIndicator message="Loading pets" detail="Calling companions and familiars to the roster." />
          ) : (
            <SearchPrompt message="No pets matched this class selection." />
          )
        ) : (
          <SearchPrompt message="Choose a class to browse pet statistics." />
        )}
        {resolvedTiming ? <p className="pt-1 text-right text-[11px] uppercase tracking-[0.16em] text-[#9f8e79]">{resolvedTiming}</p> : null}
      </SectionCard>
    </>
  );
}
