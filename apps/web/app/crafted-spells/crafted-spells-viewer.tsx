"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Search, X } from "lucide-react";
import type { CraftedSpellCatalog, CraftedSpellComponentCatalogEntry, CraftedSpellRecipe, CraftedSpellRecipeKind } from "@eq-alla/data";
import { Badge, Button } from "@eq-alla/ui";
import { DefinitionGrid, SearchPrompt, SectionCard } from "../../components/catalog-shell";
import { ItemIcon } from "../../components/item-icon";

const recipeKindOptions: Array<{ value: "" | CraftedSpellRecipeKind; label: string }> = [
  { value: "", label: "All Combines" },
  { value: "stabilizer", label: "Stabilizer" },
  { value: "amplifier", label: "Amplifier" },
  { value: "ancient-text", label: "Ancient Text" }
];

const classIconMap: Record<string, string> = {
  Bard: "/assets/icons/bard.gif",
  Beastlord: "/assets/icons/beastlord.gif",
  Berserker: "/assets/icons/berserker.gif",
  Cleric: "/assets/icons/cleric.gif",
  Druid: "/assets/icons/druid.gif",
  Enchanter: "/assets/icons/enchanter.gif",
  Magician: "/assets/icons/magician.gif",
  Monk: "/assets/icons/monk.gif",
  Necromancer: "/assets/icons/necromancer.gif",
  Paladin: "/assets/icons/paladin.gif",
  Ranger: "/assets/icons/ranger.gif",
  Rogue: "/assets/icons/rogue.gif",
  "Shadow Knight": "/assets/icons/shadowknight.gif",
  Shaman: "/assets/icons/shaman.gif",
  Warrior: "/assets/icons/warrior.gif",
  Wizard: "/assets/icons/wizard.gif"
};

const glossarySectionOrder = ["Scribestones", "Energy Focii", "Other", "Dropped"];

function matchesRecipeKind(recipe: CraftedSpellRecipe, recipeKind: "" | CraftedSpellRecipeKind) {
  return !recipeKind || recipe.recipeKind === recipeKind;
}

function groupRecipes(recipes: CraftedSpellRecipe[], selectedClasses: string[]) {
  const groups = new Map<string, { key: string; title: string; eyebrow: string; recipes: CraftedSpellRecipe[]; sortValue: number }>();
  const groupByLevel = selectedClasses.length === 1;

  for (const recipe of recipes) {
    const key = groupByLevel ? `level:${recipe.levelLabel}` : `class:${recipe.className}`;
    const title = groupByLevel ? recipe.levelLabel : recipe.className;
    const eyebrow = groupByLevel ? recipe.className : `Levels ${recipe.levelLabel}`;
    const sortValue = recipe.levelMin;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title,
        eyebrow,
        recipes: [],
        sortValue
      });
    }

    groups.get(key)?.recipes.push(recipe);
  }

  return [...groups.values()].sort((left, right) =>
    groupByLevel ? left.sortValue - right.sortValue || left.title.localeCompare(right.title) : left.title.localeCompare(right.title)
  );
}

function groupGlossary(glossary: CraftedSpellComponentCatalogEntry[]) {
  return glossarySectionOrder
    .map((section) => ({
      section,
      entries: glossary.filter((entry) => entry.section === section)
    }))
    .filter((group) => group.entries.length > 0);
}

function FilterChip({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-active={active}
      onClick={onClick}
      className="eq-crafted-chip rounded-full px-4 py-2 text-sm font-semibold transition"
    >
      {children}
    </button>
  );
}

function RecipeCard({ recipe }: { recipe: CraftedSpellRecipe }) {
  return (
    <article className="eq-crafted-recipe-card rounded-[28px] border border-white/10 p-5 shadow-[0_24px_50px_rgba(0,0,0,0.24)]">
      <div className="relative z-10 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge className="border-[#f0c36a]/20 bg-[#f0c36a]/12 text-[#ffedc0]">{recipe.className}</Badge>
              <Badge className="border-emerald-300/18 bg-emerald-300/10 text-emerald-100">{recipe.levelLabel}</Badge>
              <Badge className="border-sky-300/18 bg-sky-300/10 text-sky-100">{recipe.recipeKindLabel}</Badge>
            </div>

            <div className="flex min-w-0 items-start gap-4">
              <ItemIcon icon={recipe.reward.icon} name={recipe.reward.name} size="md" tooltipItemId={recipe.reward.id} />
              <div className="min-w-0">
                {recipe.reward.href ? (
                  <Link href={recipe.reward.href} className="block text-xl font-semibold tracking-[-0.03em] text-white hover:underline">
                    {recipe.reward.name}
                  </Link>
                ) : (
                  <p className="text-xl font-semibold tracking-[-0.03em] text-white">{recipe.reward.name}</p>
                )}
                <p className="mt-1 text-sm leading-6 text-[#d7c9ae]">
                  Crafted from <span className="font-semibold text-white">{recipe.requiredSpell.name}</span> plus Victoria&apos;s reagent set.
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-[220px] rounded-[24px] border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d9c69b]">Upgrade Path</p>
            <div className="mt-3 grid gap-3">
              <div className="flex items-center gap-3 rounded-2xl bg-white/6 px-3 py-3">
                <ItemIcon icon={recipe.requiredSpell.icon} name={recipe.requiredSpell.name} size="sm" tooltipItemId={recipe.requiredSpell.id} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#bfae86]">Turn In</p>
                  {recipe.requiredSpell.href ? (
                    <Link href={recipe.requiredSpell.href} className="block truncate text-sm font-medium text-white hover:underline">
                      {recipe.requiredSpell.name}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-medium text-white">{recipe.requiredSpell.name}</p>
                  )}
                </div>
              </div>

              <div className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-[#9fd3d0]">to receive</div>

              <div className="flex items-center gap-3 rounded-2xl bg-[#d7a45f]/12 px-3 py-3">
                <ItemIcon icon={recipe.reward.icon} name={recipe.reward.name} size="sm" tooltipItemId={recipe.reward.id} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f1d293]">Reward</p>
                  {recipe.reward.href ? (
                    <Link href={recipe.reward.href} className="block truncate text-sm font-medium text-white hover:underline">
                      {recipe.reward.name}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-medium text-white">{recipe.reward.name}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {recipe.components.map((component) => (
            <div key={`${recipe.key}-${component.slot}`} className="eq-crafted-component-tile rounded-[22px] border border-white/10 p-4">
              <div className="flex items-start gap-3">
                <ItemIcon icon={component.icon} name={component.name} size="sm" tooltipItemId={component.id} />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#bcd8d6]">{component.label}</p>
                  {component.href ? (
                    <Link href={component.href} className="mt-1 block text-sm font-semibold leading-5 text-white hover:underline">
                      {component.name}
                    </Link>
                  ) : (
                    <p className="mt-1 text-sm font-semibold leading-5 text-white">{component.name}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {component.levelRange ? (
                      <span className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] font-medium text-[#f0e3c8]">
                        {component.levelRange}
                      </span>
                    ) : null}
                    {component.price ? (
                      <span className="rounded-full border border-[#f0c36a]/18 bg-[#f0c36a]/10 px-2.5 py-1 text-[11px] font-medium text-[#ffd88b]">
                        {component.price}
                      </span>
                    ) : null}
                  </div>
                  {component.note ? <p className="mt-2 text-xs leading-5 text-[#d4cab4]">{component.note}</p> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export function CraftedSpellsViewer({
  catalog,
  initialQuery = "",
  initialRecipeKey
}: {
  catalog: CraftedSpellCatalog;
  initialQuery?: string;
  initialRecipeKey?: number;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [levelBand, setLevelBand] = useState("");
  const [recipeKind, setRecipeKind] = useState<"" | CraftedSpellRecipeKind>("");
  const [pinnedRecipeKey, setPinnedRecipeKey] = useState<number | null>(initialRecipeKey ?? null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const filteredRecipes = catalog.recipes.filter((recipe) => {
    if (pinnedRecipeKey !== null && recipe.key !== pinnedRecipeKey) {
      return false;
    }

    if (selectedClasses.length > 0 && !selectedClasses.includes(recipe.className)) {
      return false;
    }

    if (levelBand && recipe.levelLabel !== levelBand) {
      return false;
    }

    if (!matchesRecipeKind(recipe, recipeKind)) {
      return false;
    }

    if (deferredQuery && !recipe.searchText.includes(deferredQuery)) {
      return false;
    }

    return true;
  });
  const recipeGroups = groupRecipes(filteredRecipes, selectedClasses);
  const glossaryGroups = groupGlossary(catalog.glossary);
  const classFilterLabel =
    selectedClasses.length === 0
      ? `All ${catalog.classes.length} classes`
      : selectedClasses.length === 1
        ? selectedClasses[0]
        : `${selectedClasses.length} classes selected`;
  const resultHeaderLabel =
    selectedClasses.length === 0
      ? "All classes"
      : selectedClasses.length <= 3
        ? selectedClasses.join(", ")
        : `${selectedClasses.length} classes`;
  const filtersActive = Boolean(query || selectedClasses.length > 0 || levelBand || recipeKind || pinnedRecipeKey !== null);
  const resultsKey = [
    selectedClasses.slice().sort().join(",") || "all-classes",
    levelBand || "all-levels",
    recipeKind || "all-kinds",
    deferredQuery || "all-recipes"
  ].join("|");

  return (
    <>
      <SectionCard
        title="Filters"
        right={
          <div className="flex items-center gap-3">
            {filtersActive ? (
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9fd3d0]">
                {filteredRecipes.length} match{filteredRecipes.length === 1 ? "" : "es"}
              </span>
            ) : (
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9f8e79]">No filters active</span>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPinnedRecipeKey(null);
                setQuery("");
                setSelectedClasses([]);
                setLevelBand("");
                setRecipeKind("");
              }}
              disabled={!filtersActive}
              className="gap-1.5"
            >
              <X className="size-3.5" aria-hidden="true" />
              Reset
            </Button>
          </div>
        }
      >
        <div className="eq-crafted-filter-panel space-y-6">
          <label className="grid gap-2 text-sm">
            <span className="eq-crafted-filter-group-label">
              <span>Search</span>
              <span className="eq-crafted-filter-group-hint">Reward, tome, or reagent names</span>
            </span>
            <div className="eq-crafted-search-wrapper relative">
              <Search className="size-4" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setPinnedRecipeKey(null);
                  setQuery(event.target.value);
                }}
                placeholder="Purifying Chorus, Ancient Text, Minor Scribestone..."
                className="eq-crafted-search-input h-12 w-full rounded-2xl border pl-11 pr-10 text-sm outline-none transition"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setPinnedRecipeKey(null);
                    setQuery("");
                  }}
                  aria-label="Clear search"
                  className="eq-crafted-search-clear"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </label>

          <div className="space-y-3">
            <div className="eq-crafted-filter-group-label">
              <span>Class</span>
              <span className="eq-crafted-filter-group-hint">{classFilterLabel}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {catalog.classes.map((cls) => {
                const iconSrc = classIconMap[cls];
                const isActive = selectedClasses.includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => {
                      setPinnedRecipeKey(null);
                      setSelectedClasses((current) =>
                        current.includes(cls) ? current.filter((entry) => entry !== cls) : [...current, cls]
                      );
                    }}
                    aria-pressed={isActive}
                    data-active={isActive}
                    title={cls}
                    className="eq-crafted-class-button"
                  >
                    {iconSrc ? (
                      <img src={iconSrc} alt="" aria-hidden="true" className="size-9 object-contain" />
                    ) : (
                      <span className="flex size-9 items-center justify-center text-lg font-bold">{cls.charAt(0)}</span>
                    )}
                    <span className="eq-crafted-class-label">{cls}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-3">
              <div className="eq-crafted-filter-group-label">
                <span>Combine Type</span>
                <span className="eq-crafted-filter-group-hint">
                  {recipeKind ? recipeKindOptions.find((option) => option.value === recipeKind)?.label : "All combines"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recipeKindOptions.map((option) => (
                  <FilterChip
                    key={option.label}
                    active={recipeKind === option.value}
                    onClick={() => {
                      setPinnedRecipeKey(null);
                      setRecipeKind(option.value);
                    }}
                  >
                    {option.label}
                  </FilterChip>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="eq-crafted-filter-group-label">
                <span>Level Band</span>
                <span className="eq-crafted-filter-group-hint">{levelBand ? `Levels ${levelBand}` : "All levels"}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  active={levelBand === ""}
                  onClick={() => {
                    setPinnedRecipeKey(null);
                    setLevelBand("");
                  }}
                >
                  All Levels
                </FilterChip>
                {catalog.levelBands.map((band) => (
                  <FilterChip
                    key={band}
                    active={levelBand === band}
                    onClick={() => {
                      setPinnedRecipeKey(null);
                      setLevelBand(band);
                    }}
                  >
                    {band}
                  </FilterChip>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={filtersActive ? `${filteredRecipes.length} matching combines` : `${catalog.summary.totalRecipes} total combines`}
        right={<p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9fd3d0]">{resultHeaderLabel}</p>}
      >
        {filteredRecipes.length === 0 ? (
          <SearchPrompt message="No crafted spell combines matched these filters." />
        ) : (
          <div key={resultsKey} className="space-y-6">
            {recipeGroups.map((group) => (
              <section key={group.key} className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#a9d6d2]">{group.eyebrow}</p>
                    <h4 className="mt-2 font-[var(--font-display)] text-2xl font-semibold tracking-[-0.03em] text-white">{group.title}</h4>
                  </div>
                  <p className="text-sm text-[#d2c4ab]">{group.recipes.length} combines</p>
                </div>

                <div className="grid gap-4">
                  {group.recipes.map((recipe) => (
                    <RecipeCard key={recipe.key} recipe={recipe} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Component Ledger">
        <div className="grid gap-4 xl:grid-cols-2">
          {glossaryGroups.map((group) => (
            <section key={group.section} className="eq-crafted-resource-card rounded-[26px] border border-white/10 p-5">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <h4 className="font-[var(--font-display)] text-xl font-semibold tracking-[-0.03em] text-white">{group.section}</h4>
                <Badge className="border-white/10 bg-white/8 text-[#e3d7bf]">{group.entries.length} entries</Badge>
              </div>

              <div className="mt-4 grid gap-3">
                {group.entries.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/items/${entry.id}`}
                    className="block rounded-[20px] border border-white/10 bg-black/18 px-4 py-3 transition hover:border-[#f0c36a]/28 hover:bg-black/24"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white hover:underline">{entry.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#9fd3d0]">Item {entry.id}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {entry.levelRange ? (
                          <span className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] font-medium text-[#f0e3c8]">
                            {entry.levelRange}
                          </span>
                        ) : null}
                        {entry.price ? (
                          <span className="rounded-full border border-[#f0c36a]/18 bg-[#f0c36a]/10 px-2.5 py-1 text-[11px] font-medium text-[#ffd88b]">
                            {entry.price}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {entry.note ? <p className="mt-2 text-sm leading-6 text-[#d8cfbf]">{entry.note}</p> : null}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
