"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { PetSummary } from "@eq-alla/data";
import { Button } from "@eq-alla/ui";
import { ClassLoadingIndicator } from "../../components/class-loading-indicator";
import { PaginationControls, SearchPrompt, SectionCard, SimpleTable } from "../../components/catalog-shell";
import { SpellIcon } from "../../components/spell-icon";

type PetSearchClientProps = {
  initialClasses: string[];
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

type PetClassOption = {
  name: string;
  iconSrc: string;
};

const petResultsPerPage = 20;
const petSearchCacheTtlMs = 180_000;
const petSearchCacheMaxEntries = 12;
const petSearchSessionStorageKey = "eq-pet-search-cache";
const petClassOptions: PetClassOption[] = [
  { name: "Beastlord", iconSrc: "/assets/icons/beastlord.gif" },
  { name: "Cleric", iconSrc: "/assets/icons/cleric.gif" },
  { name: "Druid", iconSrc: "/assets/icons/druid.gif" },
  { name: "Enchanter", iconSrc: "/assets/icons/enchanter.gif" },
  { name: "Magician", iconSrc: "/assets/icons/magician.gif" },
  { name: "Necromancer", iconSrc: "/assets/icons/necromancer.gif" },
  { name: "Shadow Knight", iconSrc: "/assets/icons/shadowknight.gif" },
  { name: "Shaman", iconSrc: "/assets/icons/shaman.gif" },
  { name: "Wizard", iconSrc: "/assets/icons/wizard.gif" }
];

const petResultCache = new Map<string, PetCacheEntry>();
let petCacheHydrated = false;

function normalizeSelectedClasses(classNames: string[]) {
  const optionOrder = new Map(petClassOptions.map((entry, index) => [entry.name.toLowerCase(), index]));

  return [...new Set(
    classNames
      .map((entry) => petClassOptions.find((option) => option.name.toLowerCase() === entry.trim().toLowerCase())?.name)
      .filter((entry): entry is string => Boolean(entry))
  )].sort((left, right) => (optionOrder.get(left.toLowerCase()) ?? 0) - (optionOrder.get(right.toLowerCase()) ?? 0));
}

function buildSearchKey(classNames: string[]) {
  return normalizeSelectedClasses(classNames).join("|");
}

function buildQueryValue(classNames: string[]) {
  return normalizeSelectedClasses(classNames).join(",");
}

function hasQuery(classNames: string[]) {
  return buildSearchKey(classNames).length > 0;
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

function ClassSelector({
  selectedClasses,
  onToggle
}: {
  selectedClasses: string[];
  onToggle: (className: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {petClassOptions.map((option) => {
        const isSelected = selectedClasses.includes(option.name);

        return (
          <button
            key={option.name}
            type="button"
            onClick={() => onToggle(option.name)}
            aria-pressed={isSelected}
            className={`group flex items-center gap-3 rounded-[18px] border px-4 py-3 text-left transition ${
              isSelected
                ? "border-[#d7a45f]/55 bg-[linear-gradient(180deg,rgba(215,164,95,0.2),rgba(25,27,34,0.9))] shadow-[0_16px_34px_rgba(0,0,0,0.2)]"
                : "border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.92),rgba(10,14,21,0.9))] hover:border-[#c5a869]/38 hover:bg-[linear-gradient(180deg,rgba(32,38,49,0.95),rgba(14,18,25,0.92))]"
            }`}
          >
            <div className={`rounded-[14px] border p-2 ${isSelected ? "border-[#d7a45f]/40 bg-black/25" : "border-white/10 bg-black/20"}`}>
              <img src={option.iconSrc} alt="" aria-hidden="true" className="size-8 object-contain" />
            </div>
            <div className="min-w-0">
              <p className={`text-[15px] font-semibold ${isSelected ? "text-white" : "text-[#e8decd] group-hover:text-white"}`}>{option.name}</p>
              <p className={`mt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${isSelected ? "text-[#efd091]" : "text-[#9f8e79]"}`}>
                {isSelected ? "Included" : "Add filter"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function PetSearchClient({ initialClasses }: PetSearchClientProps) {
  const pathname = usePathname();
  const [selectedClasses, setSelectedClasses] = useState(() => normalizeSelectedClasses(initialClasses));
  const [results, setResults] = useState<PetSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [displayKey, setDisplayKey] = useState("");
  const [resolutionMeta, setResolutionMeta] = useState<SearchResolutionMeta | null>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [page, setPage] = useState(1);
  const abortRef = useRef<AbortController | null>(null);
  const currentUrlValueRef = useRef(buildQueryValue(initialClasses));
  const lastHandledSubmitRef = useRef(0);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const nextSelectedClasses = normalizeSelectedClasses(initialClasses);
    const nextQueryValue = buildQueryValue(nextSelectedClasses);
    const nextKey = buildSearchKey(nextSelectedClasses);

    setSelectedClasses(nextSelectedClasses);
    currentUrlValueRef.current = nextQueryValue;
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
  }, [initialClasses]);

  const toggleClass = (className: string) => {
    setSelectedClasses((current) =>
      current.includes(className)
        ? current.filter((entry) => entry !== className)
        : normalizeSelectedClasses([...current, className])
    );
  };

  const submitSearch = () => {
    if (!hasQuery(selectedClasses)) return;
    setSubmitCount((current) => current + 1);
  };

  const clearSelection = () => {
    abortRef.current?.abort();
    setSelectedClasses([]);
    setResults([]);
    setError(null);
    setDisplayKey("");
    setIsFetching(false);
    setResolutionMeta(null);
    setPage(1);
    currentUrlValueRef.current = "";
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", pathname);
    }
  };

  useEffect(() => {
    if (submitCount === 0 || submitCount === lastHandledSubmitRef.current) {
      return;
    }

    lastHandledSubmitRef.current = submitCount;
    const nextQueryValue = buildQueryValue(selectedClasses);
    const nextKey = buildSearchKey(selectedClasses);
    const nextHref = nextQueryValue ? `${pathname}?classes=${encodeURIComponent(nextQueryValue)}` : pathname;

    if (nextQueryValue !== currentUrlValueRef.current) {
      currentUrlValueRef.current = nextQueryValue;
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", nextHref);
      }
    }

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
        const response = await fetch(`/api/pets?classes=${encodeURIComponent(nextQueryValue)}`, { signal: controller.signal });
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
  }, [pathname, selectedClasses, submitCount]);

  const showResults = hasQuery(selectedClasses) || isFetching || displayKey.length > 0;
  const totalPages = Math.max(1, Math.ceil(results.length / petResultsPerPage));
  const visiblePage = Math.min(page, totalPages);
  const pagedResults = results.slice((visiblePage - 1) * petResultsPerPage, visiblePage * petResultsPerPage);
  const resultTitle = showResults ? (isFetching && results.length === 0 ? "Loading pets" : `${results.length} pets`) : "Results";
  const statusLabel = error
    ? error
    : isFetching
      ? "Refreshing results..."
      : hasQuery(selectedClasses) && buildSearchKey(selectedClasses) === displayKey
        ? "Filters applied"
        : hasQuery(selectedClasses)
          ? "Press Search to apply class filters"
          : "Select one or more classes";
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
        title="Browse by class"
        right={
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium text-[#ccb594]">{statusLabel}</p>
            <Button type="button" className="px-3 py-2 text-xs uppercase tracking-[0.14em]" onClick={submitSearch} disabled={!hasQuery(selectedClasses)}>
              Search
            </Button>
            {selectedClasses.length > 0 ? (
              <Button type="button" variant="outline" className="px-3 py-2 text-xs uppercase tracking-[0.14em]" onClick={clearSelection}>
                Clear
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="space-y-4">
          <div className="max-w-3xl text-sm leading-7 text-[#d7ccbb]">
            Choose one or more owner classes to pull their summoned pets into the roster below.
          </div>
          <ClassSelector selectedClasses={selectedClasses} onToggle={toggleClass} />
        </div>
      </SectionCard>

      <SectionCard title={resultTitle}>
        {showResults && results.length > 0 ? (
          <>
            <SimpleTable
              columns={["Class", "Level", "Icon", "Spell name", "Details", "Race", "Pet level", "Pet class", "HP", "Mana", "AC", "Min damage", "Max damage"]}
              rows={pagedResults.map((pet) => [
                pet.ownerClass,
                pet.spellLevel,
                <SpellIcon key={`${pet.id}-${pet.ownerClassId}-icon`} icon={pet.spellIcon} name={pet.spellName} />,
                <Link key={`${pet.id}-${pet.ownerClassId}-spell`} href={`/spells/${pet.spellId}`} className="font-medium hover:underline">
                  {pet.spellName}
                </Link>,
                <Link key={`${pet.id}-${pet.ownerClassId}-detail`} href={`/pets/${pet.id}`} className="font-medium hover:underline">
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
            <PaginationControls
              currentPage={visiblePage}
              totalPages={totalPages}
              totalItems={results.length}
              pageSize={petResultsPerPage}
              onPageChange={setPage}
            />
          </>
        ) : showResults ? (
          isFetching ? (
            <ClassLoadingIndicator message="Loading pets" detail="Calling companions and familiars to the roster." />
          ) : buildSearchKey(selectedClasses) !== displayKey ? (
            <SearchPrompt message="Press Search to apply these class filters." />
          ) : (
            <SearchPrompt message="No pets matched the selected classes." />
          )
        ) : (
          <SearchPrompt message="Choose one or more class icons to browse pet statistics." />
        )}
        {resolvedTiming ? <p className="pt-1 text-right text-[11px] uppercase tracking-[0.16em] text-[#9f8e79]">{resolvedTiming}</p> : null}
      </SectionCard>
    </>
  );
}
