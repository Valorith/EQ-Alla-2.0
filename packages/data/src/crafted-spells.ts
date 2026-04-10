import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "kysely";
import { cacheGet, cacheSet } from "./cache";
import { getDb } from "./db";
import { env } from "./env";
import type {
  CraftedSpellCatalog,
  CraftedSpellComponentCatalogEntry,
  CraftedSpellItem,
  CraftedSpellRecipe,
  CraftedSpellRecipeComponent,
  CraftedSpellRecipeKind
} from "./types";

const victoriaRepositoryUrl = "https://github.com/Isaaru/cw-quests.git";
const victoriaRepositoryRef = "main";
const victoriaScriptPath = "tutorial/Victoria.pl";
const victoriaContentsApiUrl = `https://api.github.com/repos/Isaaru/cw-quests/contents/${victoriaScriptPath}?ref=${victoriaRepositoryRef}`;
const craftedSpellCacheKey = "crafted-spells:victoria:v1";
const craftedSpellRefreshIntervalSeconds = 6 * 60 * 60;
const craftedSpellStaleTtlSeconds = 24 * 60 * 60;
const craftedSpellRefreshRetryBackoffMs = 10 * 60 * 1_000;
const craftedSpellSnapshotPath = path.join("data", "crafted-spells", "catalog.json");
const craftedSpellSourcePath = path.join("data", "crafted-spells", "Victoria.pl");
const craftedSpellSyntheticRecipeIdOffset = 1_000_000_000;

let craftedSpellRefreshPromise: Promise<CraftedSpellCatalog> | null = null;
let craftedSpellSnapshotPromise: Promise<CraftedSpellCatalog | null> | null = null;
let craftedSpellLastRefreshAttemptAt = 0;

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

type ResolvedCraftedSpellCatalog = {
  catalog: CraftedSpellCatalog;
  source: string;
};

type GitHubContentsResponse = {
  content?: string;
  encoding?: string;
  download_url?: string | null;
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

async function resolveDataBaseDir() {
  let current = process.cwd();
  let matched: string | null = null;

  while (true) {
    if (await pathExists(path.join(current, "data"))) {
      matched = current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }

    current = parent;
  }

  return matched ?? process.cwd();
}

async function resolveDataFile(relativePath: string) {
  const candidate = path.join(await resolveDataBaseDir(), relativePath);
  return (await pathExists(candidate)) ? candidate : null;
}

async function ensureDataFile(relativePath: string) {
  const target = path.join(await resolveDataBaseDir(), relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  return target;
}

function getCatalogFetchedAt(catalog: CraftedSpellCatalog | null | undefined) {
  if (!catalog) {
    return Number.NaN;
  }

  return Date.parse(catalog.source.fetchedAt);
}

function isCraftedSpellCatalogStale(catalog: CraftedSpellCatalog) {
  const fetchedAt = getCatalogFetchedAt(catalog);
  if (!Number.isFinite(fetchedAt)) {
    return true;
  }

  return Date.now() - fetchedAt >= craftedSpellRefreshIntervalSeconds * 1_000;
}

function chooseFreshestCatalog(...candidates: Array<CraftedSpellCatalog | null | undefined>) {
  let freshest: CraftedSpellCatalog | null = null;

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    if (!freshest || getCatalogFetchedAt(candidate) >= getCatalogFetchedAt(freshest)) {
      freshest = candidate;
    }
  }

  return freshest;
}

async function readCraftedSpellCatalogSnapshot(forceRefresh = false) {
  if (!forceRefresh && craftedSpellSnapshotPromise) {
    return craftedSpellSnapshotPromise;
  }

  craftedSpellSnapshotPromise = (async () => {
    const snapshotFile = await resolveDataFile(craftedSpellSnapshotPath);

    if (!snapshotFile) {
      return null;
    }

    const payload = await readFile(snapshotFile, "utf8");
    return JSON.parse(payload) as CraftedSpellCatalog;
  })();

  return craftedSpellSnapshotPromise;
}

async function persistCraftedSpellArtifacts(catalog: CraftedSpellCatalog, source: string) {
  const [snapshotFile, sourceFile] = await Promise.all([
    ensureDataFile(craftedSpellSnapshotPath),
    ensureDataFile(craftedSpellSourcePath)
  ]);

  await Promise.all([
    writeFile(snapshotFile, `${JSON.stringify(catalog, null, 2)}\n`, "utf8"),
    writeFile(sourceFile, source, "utf8")
  ]);

  craftedSpellSnapshotPromise = Promise.resolve(catalog);
}

async function readVictoriaSource() {
  const sourceFile = await resolveDataFile(craftedSpellSourcePath);

  if (!sourceFile) {
    throw new Error(`Unable to locate Victoria source at ${craftedSpellSourcePath}.`);
  }

  return readFile(sourceFile, "utf8");
}

function getGitHubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "EQ-Alla-2.0",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (env.EQ_GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.EQ_GITHUB_TOKEN}`;
  }

  return headers;
}

async function fetchVictoriaSourceFromGitHubApi() {
  const response = await fetch(victoriaContentsApiUrl, {
    headers: getGitHubHeaders()
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch Victoria.pl from GitHub (${response.status} ${response.statusText}).`);
  }

  const payload = (await response.json()) as GitHubContentsResponse;
  if (payload.encoding !== "base64" || !payload.content) {
    throw new Error("GitHub returned Victoria.pl in an unexpected format.");
  }

  return Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8");
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

function buildCraftedSpellCatalog(
  parsed: ReturnType<typeof parseVictoriaSpellCraftingSource>,
  itemMetadata: Map<number, { name: string; icon: string }>,
  fetchStrategy: string,
  fetchedAt: string
) {
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

  return {
    source: {
      repositoryUrl: victoriaRepositoryUrl,
      repositoryRef: victoriaRepositoryRef,
      scriptPath: victoriaScriptPath,
      fetchedAt,
      cacheTtlSeconds: craftedSpellRefreshIntervalSeconds,
      fetchStrategy
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
  } satisfies CraftedSpellCatalog;
}

async function resolveCraftedSpellCatalog(): Promise<ResolvedCraftedSpellCatalog> {
  let source: string;
  let fetchStrategy = "github-contents-api";

  try {
    source = await fetchVictoriaSourceFromGitHubApi();
  } catch {
    source = await readVictoriaSource();
    fetchStrategy = "source-parse";
  }

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

  return {
    catalog: buildCraftedSpellCatalog(parsed, itemMetadata, fetchStrategy, new Date().toISOString()),
    source
  };
}

async function refreshCraftedSpellCatalog() {
  if (craftedSpellRefreshPromise) {
    return craftedSpellRefreshPromise;
  }

  craftedSpellLastRefreshAttemptAt = Date.now();
  craftedSpellRefreshPromise = (async () => {
    const { catalog, source } = await resolveCraftedSpellCatalog();
    await cacheSet(craftedSpellCacheKey, catalog, craftedSpellStaleTtlSeconds);
    await persistCraftedSpellArtifacts(catalog, source);
    return catalog;
  })();

  try {
    return await craftedSpellRefreshPromise;
  } finally {
    craftedSpellRefreshPromise = null;
  }
}

export async function getCraftedSpellCatalog() {
  const [cached, snapshot] = await Promise.all([
    cacheGet<CraftedSpellCatalog>(craftedSpellCacheKey),
    readCraftedSpellCatalogSnapshot()
  ]);

  const current = chooseFreshestCatalog(snapshot, cached);

  if (current) {
    const refreshBackoffElapsed = Date.now() - craftedSpellLastRefreshAttemptAt >= craftedSpellRefreshRetryBackoffMs;

    if (isCraftedSpellCatalogStale(current) && refreshBackoffElapsed) {
      void refreshCraftedSpellCatalog().catch(() => undefined);
    }

    return current;
  }

  return refreshCraftedSpellCatalog();
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
