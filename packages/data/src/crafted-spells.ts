import { access, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sql } from "kysely";
import { cacheGet, cacheSet } from "./cache";
import { getDb } from "./db";
import type {
  CraftedSpellCatalog,
  CraftedSpellComponentCatalogEntry,
  CraftedSpellItem,
  CraftedSpellRecipe,
  CraftedSpellRecipeComponent,
  CraftedSpellRecipeKind
} from "./types";

const execFileAsync = promisify(execFile);

const victoriaRepositoryUrl = "https://github.com/Isaaru/cw-quests.git";
const victoriaRepositoryRef = "main";
const victoriaScriptPath = "tutorial/Victoria.pl";
const craftedSpellCacheKey = "crafted-spells:victoria:v1";
const craftedSpellRefreshIntervalSeconds = 6 * 60 * 60;
const craftedSpellStaleTtlSeconds = 24 * 60 * 60;
const craftedSpellMirrorDir = path.join(os.tmpdir(), `eq-alla-crafted-spells-source-${process.pid}`);
const craftedSpellSyntheticRecipeIdOffset = 1_000_000_000;
const gitLockFileNames = ["shallow.lock", "index.lock", "packed-refs.lock"] as const;

let craftedSpellRefreshPromise: Promise<CraftedSpellCatalog> | null = null;

const classDisplayNames: Record<string, string> = {
  bard: "Bard",
  beastlord: "Beastlord",
  berserker: "Berserker",
  cleric: "Cleric",
  druid: "Druid",
  enchanter: "Enchanter",
  magician: "Magician",
  necromancer: "Necromancer",
  paladin: "Paladin",
  ranger: "Ranger",
  rogue: "Rogue",
  shadowknight: "Shadow Knight",
  shaman: "Shaman",
  wizard: "Wizard"
};

type ParsedVictoriaRecipe = {
  key: number;
  className: string;
  levelCode: number;
  rewardName?: string;
  itemIds: {
    scribestone: number;
    focus: number;
    catalyst: number;
    requiredSpell: number;
    reward: number;
  };
};

function normalizeSpacing(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeClassName(raw: string) {
  const folded = raw.replace(/\s+/g, "").toLowerCase();
  return classDisplayNames[folded] ?? normalizeSpacing(raw);
}

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function decodeLevelCode(levelCode: number) {
  const text = String(levelCode).trim();

  if (text.length === 4) {
    const min = Number(text.slice(0, 2));
    const max = Number(text.slice(2));
    return {
      min,
      max,
      label: `${min} - ${max}`
    };
  }

  const level = Number(text);
  return {
    min: level,
    max: level,
    label: String(level)
  };
}

function recipeKindFromCatalyst(catalystId: number): { kind: CraftedSpellRecipeKind; label: string } {
  if (catalystId === 150123) {
    return { kind: "amplifier", label: "Amplifier Combine" };
  }

  if (catalystId === 150248) {
    return { kind: "stabilizer", label: "Stabilizer Combine" };
  }

  if (catalystId === 150600) {
    return { kind: "ancient-text", label: "Ancient Text Combine" };
  }

  return { kind: "special", label: "Special Combine" };
}

function isPriceToken(value: string) {
  return /^\d+(?:\.\d+)?\s*(?:pp|gp|sp|cp)$/i.test(value.trim());
}

function isLevelRangeToken(value: string) {
  return /^\d+\s*-\s*\d+$/.test(value.trim()) || /^\d+$/.test(value.trim());
}

function parseGlossary(source: string) {
  const glossary: CraftedSpellComponentCatalogEntry[] = [];
  const byId = new Map<number, CraftedSpellComponentCatalogEntry>();
  let currentSection = "";

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    const sectionMatch = line.match(/^#::\s*(.+?)\s*::#$/);
    if (sectionMatch) {
      currentSection = normalizeSpacing(sectionMatch[1]);
      continue;
    }

    const entryMatch = line.match(/^#\s*(\d+)\s*:\s*(.+)$/);
    if (!entryMatch || !currentSection || currentSection === "Components") {
      continue;
    }

    const id = Number(entryMatch[1]);
    const parts = entryMatch[2]
      .split(":")
      .map((part) => normalizeSpacing(part))
      .filter(Boolean);

    const name = parts[0];
    if (!name) {
      continue;
    }

    let levelRange: string | undefined;
    let price: string | undefined;
    let note: string | undefined;

    if (parts.length >= 2) {
      const second = parts[1];
      if (isLevelRangeToken(second)) {
        levelRange = second;
      } else if (isPriceToken(second)) {
        price = second;
      } else {
        note = second;
      }
    }

    if (parts.length >= 3) {
      const third = parts[2];
      if (!price && isPriceToken(third)) {
        price = third;
      } else if (!note) {
        note = third;
      }
    }

    const entry: CraftedSpellComponentCatalogEntry = {
      id,
      name,
      section: currentSection,
      levelRange,
      price,
      note
    };

    glossary.push(entry);
    byId.set(id, entry);
  }

  return { glossary, glossaryById: byId };
}

export function parseVictoriaSpellCraftingSource(source: string) {
  const { glossary, glossaryById } = parseGlossary(source);
  const combinesMatch = source.match(/%combines\s*=\s*\(([\s\S]*?)\);\s*sub\s+EVENT_SAY/);

  if (!combinesMatch) {
    throw new Error("Could not locate the Victoria combine table.");
  }

  const recipes: ParsedVictoriaRecipe[] = [];
  const combineLines = combinesMatch[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+\s*=>\s*{/.test(line));

  for (const line of combineLines) {
    const combineMatch = line.match(/^(\d+)\s*=>\s*{(.+?)}\s*,?\s*(?:#\s*(.+))?$/);
    if (!combineMatch) {
      continue;
    }

    const key = Number(combineMatch[1]);
    const body = combineMatch[2];
    const rewardName = combineMatch[3] ? normalizeSpacing(combineMatch[3]) : undefined;
    const values = new Map<string, string>();
    const pairMatches = body.matchAll(/"([^"]+)"\s*=>\s*(?:"([^"]*)"|(\d+))/g);

    for (const match of pairMatches) {
      values.set(match[1], match[2] ?? match[3] ?? "");
    }

    const className = normalizeClassName(values.get("class") ?? "Unknown");
    const levelCode = Number(values.get("level") ?? 0);

    recipes.push({
      key,
      className,
      levelCode,
      rewardName,
      itemIds: {
        scribestone: Number(values.get("item1") ?? 0),
        focus: Number(values.get("item2") ?? 0),
        catalyst: Number(values.get("item3") ?? 0),
        requiredSpell: Number(values.get("item4") ?? 0),
        reward: Number(values.get("reward") ?? 0)
      }
    });
  }

  return {
    glossary,
    glossaryById,
    recipes
  };
}

async function pathExists(target: string) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function ensureGitMirror() {
  await mkdir(craftedSpellMirrorDir, { recursive: true });

  if (await pathExists(path.join(craftedSpellMirrorDir, ".git"))) {
    return;
  }

  await execFileAsync("git", ["init"], {
    cwd: craftedSpellMirrorDir,
    windowsHide: true,
    timeout: 20_000
  });

  await execFileAsync("git", ["remote", "add", "origin", victoriaRepositoryUrl], {
    cwd: craftedSpellMirrorDir,
    windowsHide: true,
    timeout: 20_000
  });
}

async function clearStaleGitLocks() {
  await Promise.all(
    gitLockFileNames.map((lockFileName) =>
      rm(path.join(craftedSpellMirrorDir, ".git", lockFileName), {
        force: true
      }).catch(() => undefined)
    )
  );
}

function isGitLockError(error: unknown) {
  return error instanceof Error && /\.lock': File exists\./i.test(error.message);
}

async function runGitCommand(args: string[], options?: { maxBuffer?: number }) {
  try {
    return await execFileAsync("git", args, {
      cwd: craftedSpellMirrorDir,
      windowsHide: true,
      timeout: 30_000,
      maxBuffer: options?.maxBuffer
    });
  } catch (error) {
    if (!isGitLockError(error)) {
      throw error;
    }

    await clearStaleGitLocks();

    return execFileAsync("git", args, {
      cwd: craftedSpellMirrorDir,
      windowsHide: true,
      timeout: 30_000,
      maxBuffer: options?.maxBuffer
    });
  }
}

async function fetchVictoriaSource() {
  await ensureGitMirror();

  await runGitCommand(["fetch", "--depth", "1", "origin", victoriaRepositoryRef]);

  const { stdout } = await runGitCommand(["show", `FETCH_HEAD:${victoriaScriptPath}`], {
    maxBuffer: 1024 * 1024 * 4
  });

  return stdout;
}

async function getItemMetadata(ids: number[]) {
  const db = getDb();
  const metadata = new Map<number, { name: string; icon: string }>();

  if (!db || ids.length === 0) {
    return metadata;
  }

  const rows = await sql<{ id: number; name: string | null; icon: number | null }>`
    select id, Name as name, icon
    from items
    where id in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
  `.execute(db);

  for (const row of rows.rows) {
    metadata.set(row.id, {
      name: normalizeSpacing(row.name ?? `Item ${row.id}`),
      icon: String(row.icon ?? "")
    });
  }

  return metadata;
}

function toCatalogItem(
  id: number,
  itemMetadata: Map<number, { name: string; icon: string }>,
  fallbackName?: string
): CraftedSpellItem {
  const metadata = itemMetadata.get(id);
  return {
    id,
    name: metadata?.name ?? fallbackName ?? `Item ${id}`,
    icon: metadata?.icon ?? "",
    href: id > 0 ? `/items/${id}` : undefined
  };
}

function createRecipeComponent(
  id: number,
  slot: CraftedSpellRecipeComponent["slot"],
  label: string,
  itemMetadata: Map<number, { name: string; icon: string }>,
  glossaryById: Map<number, CraftedSpellComponentCatalogEntry>,
  fallbackName?: string
): CraftedSpellRecipeComponent {
  const item = toCatalogItem(id, itemMetadata, fallbackName ?? glossaryById.get(id)?.name);
  const glossaryEntry = glossaryById.get(id);

  return {
    ...item,
    slot,
    label,
    levelRange: glossaryEntry?.levelRange,
    price: glossaryEntry?.price,
    note: glossaryEntry?.note
  };
}

async function resolveCraftedSpellCatalog() {
  const source = await fetchVictoriaSource();
  const parsed = parseVictoriaSpellCraftingSource(source);
  const allItemIds = Array.from(
    new Set(
      parsed.glossary.map((entry) => entry.id).concat(
        parsed.recipes.flatMap((recipe) => [
          recipe.itemIds.scribestone,
          recipe.itemIds.focus,
          recipe.itemIds.catalyst,
          recipe.itemIds.requiredSpell,
          recipe.itemIds.reward
        ])
      )
    )
  ).filter((id) => id > 0);
  const itemMetadata = await getItemMetadata(allItemIds);

  const recipes = parsed.recipes
    .map<CraftedSpellRecipe>((recipe) => {
      const level = decodeLevelCode(recipe.levelCode);
      const kind = recipeKindFromCatalyst(recipe.itemIds.catalyst);
      const requiredSpell = toCatalogItem(recipe.itemIds.requiredSpell, itemMetadata);
      const reward = toCatalogItem(recipe.itemIds.reward, itemMetadata, recipe.rewardName);
      const components: CraftedSpellRecipeComponent[] = [
        createRecipeComponent(recipe.itemIds.scribestone, "scribestone", "Scribestone", itemMetadata, parsed.glossaryById),
        createRecipeComponent(recipe.itemIds.focus, "focus", "Energy Focus", itemMetadata, parsed.glossaryById),
        createRecipeComponent(recipe.itemIds.catalyst, "catalyst", "Catalyst", itemMetadata, parsed.glossaryById),
        createRecipeComponent(recipe.itemIds.requiredSpell, "required-spell", "Required Spell/Tome", itemMetadata, parsed.glossaryById)
      ];

      return {
        key: recipe.key,
        className: recipe.className,
        classSlug: toSlug(recipe.className),
        levelCode: recipe.levelCode,
        levelLabel: level.label,
        levelMin: level.min,
        levelMax: level.max,
        recipeKind: kind.kind,
        recipeKindLabel: kind.label,
        requiredSpell,
        reward,
        components,
        searchText: [
          recipe.className,
          level.label,
          requiredSpell.name,
          reward.name,
          kind.label,
          ...components.map((component) => `${component.label} ${component.name} ${component.note ?? ""} ${component.price ?? ""}`)
        ]
          .join(" ")
          .toLowerCase()
      };
    })
    .sort(
      (left, right) =>
        left.className.localeCompare(right.className) ||
        left.levelMin - right.levelMin ||
        left.reward.name.localeCompare(right.reward.name)
    );

  const classes = [...new Set(recipes.map((recipe) => recipe.className))];
  const levelBands = [...new Set(recipes.map((recipe) => recipe.levelLabel))].sort((left, right) => {
    const leftStart = Number(left.match(/\d+/)?.[0] ?? 0);
    const rightStart = Number(right.match(/\d+/)?.[0] ?? 0);
    return leftStart - rightStart;
  });

  const catalog: CraftedSpellCatalog = {
    source: {
      repositoryUrl: victoriaRepositoryUrl,
      repositoryRef: victoriaRepositoryRef,
      scriptPath: victoriaScriptPath,
      fetchedAt: new Date().toISOString(),
      cacheTtlSeconds: craftedSpellRefreshIntervalSeconds,
      fetchStrategy: "git-fetch"
    },
    glossary: parsed.glossary
      .map((entry) => {
        const enriched = itemMetadata.get(entry.id);
        return {
          ...entry,
          name: enriched?.name ?? entry.name
        };
      })
      .sort((left, right) => left.section.localeCompare(right.section) || left.id - right.id),
    recipes,
    classes,
    levelBands,
    summary: {
      totalRecipes: recipes.length,
      totalClasses: classes.length,
      totalLevelBands: levelBands.length,
      ancientCount: recipes.filter((recipe) => recipe.recipeKind === "ancient-text").length,
      amplifierCount: recipes.filter((recipe) => recipe.recipeKind === "amplifier").length,
      stabilizerCount: recipes.filter((recipe) => recipe.recipeKind === "stabilizer").length
    }
  };

  return catalog;
}

export async function getCraftedSpellCatalog() {
  const cached = await cacheGet<CraftedSpellCatalog>(craftedSpellCacheKey);

  const cachedFetchedAt = cached ? Date.parse(cached.source.fetchedAt) : Number.NaN;
  const cacheAgeMs = Number.isFinite(cachedFetchedAt) ? Date.now() - cachedFetchedAt : Number.POSITIVE_INFINITY;

  if (cached && cacheAgeMs < craftedSpellRefreshIntervalSeconds * 1_000) {
    return cached;
  }

  if (craftedSpellRefreshPromise) {
    try {
      return await craftedSpellRefreshPromise;
    } catch (error) {
      if (cached) {
        return cached;
      }

      throw error;
    }
  }

  craftedSpellRefreshPromise = resolveCraftedSpellCatalog();

  try {
    const catalog = await craftedSpellRefreshPromise;
    await cacheSet(craftedSpellCacheKey, catalog, craftedSpellStaleTtlSeconds);
    return catalog;
  } catch (error) {
    if (cached) {
      return cached;
    }

    throw error;
  } finally {
    craftedSpellRefreshPromise = null;
  }
}

function craftedSpellRecipeSearchHref(recipe: CraftedSpellRecipe) {
  const params = new URLSearchParams({
    q: recipe.reward.name,
    recipe: String(recipe.key)
  });

  return `/crafted-spells?${params.toString()}`;
}

export async function getCraftedSpellRecipeRefsForItem(itemId: number) {
  if (!Number.isFinite(itemId) || itemId <= 0) {
    return [];
  }

  const catalog = await getCraftedSpellCatalog();

  return catalog.recipes
    .filter(
      (recipe) =>
        recipe.reward.id === itemId ||
        recipe.requiredSpell.id === itemId ||
        recipe.components.some((component) => component.id === itemId)
    )
    .map((recipe) => ({
      id: craftedSpellSyntheticRecipeIdOffset + recipe.key,
      name: `Victoria: ${recipe.className} ${recipe.levelLabel} ${recipe.recipeKindLabel}`,
      href: craftedSpellRecipeSearchHref(recipe)
    }))
    .sort((left, right) => left.name.localeCompare(right.name) || left.href.localeCompare(right.href));
}
