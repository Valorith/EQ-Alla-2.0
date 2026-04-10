import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const repoRoot = process.cwd();
const craftedSpellDir = path.join(repoRoot, "data", "crafted-spells");
const craftedSpellSourcePath = path.join(craftedSpellDir, "Victoria.pl");
const craftedSpellCatalogPath = path.join(craftedSpellDir, "catalog.json");
const victoriaRepositoryUrl = "https://github.com/Isaaru/cw-quests.git";
const victoriaRepositoryRef = "main";
const victoriaScriptPath = "tutorial/Victoria.pl";
const victoriaContentsApiUrl = `https://api.github.com/repos/Isaaru/cw-quests/contents/${victoriaScriptPath}?ref=${victoriaRepositoryRef}`;
const craftedSpellRefreshIntervalSeconds = 6 * 60 * 60;

const classDisplayNames = {
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

function normalizeSpacing(value) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeClassName(raw) {
  const folded = raw.replace(/\s+/g, "").toLowerCase();
  return classDisplayNames[folded] ?? normalizeSpacing(raw);
}

function toSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function decodeLevelCode(levelCode) {
  const text = String(levelCode).trim();

  if (text.length === 4) {
    const min = Number(text.slice(0, 2));
    const max = Number(text.slice(2));
    return { min, max, label: `${min} - ${max}` };
  }

  const level = Number(text);
  return { min: level, max: level, label: String(level) };
}

function recipeKindFromCatalyst(catalystId) {
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

function isPriceToken(value) {
  return /^\d+(?:\.\d+)?\s*(?:pp|gp|sp|cp)$/i.test(value.trim());
}

function isLevelRangeToken(value) {
  return /^\d+\s*-\s*\d+$/.test(value.trim()) || /^\d+$/.test(value.trim());
}

function parseGlossary(source) {
  const glossary = [];
  const glossaryById = new Map();
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

    let levelRange;
    let price;
    let note;

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

    const entry = {
      id,
      name,
      section: currentSection,
      levelRange,
      price,
      note
    };

    glossary.push(entry);
    glossaryById.set(id, entry);
  }

  return { glossary, glossaryById };
}

function parseVictoriaSpellCraftingSource(source) {
  const { glossary, glossaryById } = parseGlossary(source);
  const combinesMatch = source.match(/%combines\s*=\s*\(([\s\S]*?)\);\s*sub\s+EVENT_SAY/);

  if (!combinesMatch) {
    throw new Error("Could not locate the Victoria combine table.");
  }

  const recipes = [];
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
    const values = new Map();
    const pairMatches = body.matchAll(/"([^"]+)"\s*=>\s*(?:"([^"]*)"|(\d+))/g);

    for (const match of pairMatches) {
      values.set(match[1], match[2] ?? match[3] ?? "");
    }

    recipes.push({
      key,
      className: normalizeClassName(values.get("class") ?? "Unknown"),
      levelCode: Number(values.get("level") ?? 0),
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

  return { glossary, glossaryById, recipes };
}

function parseEnv(contents) {
  const values = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function setEnvIfMissing(env, key, value) {
  if (!value || env[key] !== undefined) {
    return;
  }

  env[key] = value;
}

function applyDatabaseFallbacks(env) {
  setEnvIfMissing(env, "EQ_DB_HOST", env.MYSQLHOST);
  setEnvIfMissing(env, "EQ_DB_PORT", env.MYSQLPORT);
  setEnvIfMissing(env, "EQ_DB_NAME", env.MYSQLDATABASE);
  setEnvIfMissing(env, "EQ_DB_USER", env.MYSQLUSER);
  setEnvIfMissing(env, "EQ_DB_PASSWORD", env.MYSQLPASSWORD);

  const connectionUrl = env.DATABASE_URL ?? env.MYSQL_URL;
  if (!connectionUrl) {
    return;
  }

  let parsed;
  try {
    parsed = new URL(connectionUrl);
  } catch {
    return;
  }

  if (parsed.protocol !== "mysql:" && parsed.protocol !== "mysql2:") {
    return;
  }

  setEnvIfMissing(env, "EQ_DB_HOST", parsed.hostname || undefined);
  setEnvIfMissing(env, "EQ_DB_PORT", parsed.port || undefined);
  setEnvIfMissing(env, "EQ_DB_NAME", parsed.pathname.replace(/^\//, "") || undefined);
  setEnvIfMissing(env, "EQ_DB_USER", parsed.username ? decodeURIComponent(parsed.username) : undefined);
  setEnvIfMissing(env, "EQ_DB_PASSWORD", parsed.password ? decodeURIComponent(parsed.password) : undefined);
}

function applyGitHubFallbacks(env) {
  setEnvIfMissing(env, "EQ_GITHUB_TOKEN", env.GITHUB_TOKEN);
}

async function loadEnv() {
  const env = { ...process.env };

  for (const filename of [".env.local", ".env", "env.local", "env"]) {
    const candidate = path.join(repoRoot, filename);
    try {
      const parsed = parseEnv(await fs.readFile(candidate, "utf8"));
      for (const [key, value] of Object.entries(parsed)) {
        if (env[key] === undefined) {
          env[key] = value;
        }
      }
    } catch {}
  }

  applyGitHubFallbacks(env);
  applyDatabaseFallbacks(env);
  return env;
}

function getGitHubHeaders(env) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "EQ-Alla-2.0",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (env.EQ_GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.EQ_GITHUB_TOKEN}`;
  }

  return headers;
}

async function fetchVictoriaSource(env) {
  const response = await fetch(victoriaContentsApiUrl, {
    headers: getGitHubHeaders(env)
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch Victoria.pl from GitHub (${response.status} ${response.statusText}).`);
  }

  const payload = await response.json();
  if (payload.encoding !== "base64" || !payload.content) {
    throw new Error("GitHub returned Victoria.pl in an unexpected format.");
  }

  return Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8");
}

async function readExistingVictoriaSource() {
  return fs.readFile(craftedSpellSourcePath, "utf8");
}

async function getItemMetadata(ids, env) {
  const metadata = new Map();

  if (!env.EQ_DB_HOST || !env.EQ_DB_NAME || !env.EQ_DB_USER || ids.length === 0) {
    return metadata;
  }

  const connection = await mysql.createConnection({
    host: env.EQ_DB_HOST,
    port: Number(env.EQ_DB_PORT || 3306),
    database: env.EQ_DB_NAME,
    user: env.EQ_DB_USER,
    password: env.EQ_DB_PASSWORD || ""
  });

  try {
    const [rows] = await connection.query(
      `
        select id, Name as name, icon
        from items
        where id in (?)
      `,
      [ids]
    );

    for (const row of rows) {
      metadata.set(Number(row.id), {
        name: normalizeSpacing(row.name ?? `Item ${row.id}`),
        icon: String(row.icon ?? "")
      });
    }
  } finally {
    await connection.end();
  }

  return metadata;
}

function toCatalogItem(id, itemMetadata, fallbackName) {
  const metadata = itemMetadata.get(id);
  return {
    id,
    name: metadata?.name ?? fallbackName ?? `Item ${id}`,
    icon: metadata?.icon ?? "",
    href: id > 0 ? `/items/${id}` : undefined
  };
}

function createRecipeComponent(id, slot, label, itemMetadata, glossaryById, fallbackName) {
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

function buildCraftedSpellCatalog(parsed, itemMetadata, fetchStrategy) {
  const recipes = parsed.recipes
    .map((recipe) => {
      const level = decodeLevelCode(recipe.levelCode);
      const kind = recipeKindFromCatalyst(recipe.itemIds.catalyst);
      const requiredSpell = toCatalogItem(recipe.itemIds.requiredSpell, itemMetadata);
      const reward = toCatalogItem(recipe.itemIds.reward, itemMetadata, recipe.rewardName);
      const components = [
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
      fetchedAt: new Date().toISOString(),
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
  };
}

async function main() {
  const env = await loadEnv();
  let source;
  let fetchStrategy = "github-contents-api";

  try {
    source = await fetchVictoriaSource(env);
  } catch {
    source = await readExistingVictoriaSource();
    fetchStrategy = "local-source-fallback";
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
  const itemMetadata = await getItemMetadata(allItemIds, env);
  const catalog = buildCraftedSpellCatalog(parsed, itemMetadata, fetchStrategy);

  await fs.mkdir(craftedSpellDir, { recursive: true });
  await Promise.all([
    fs.writeFile(craftedSpellSourcePath, source, "utf8"),
    fs.writeFile(craftedSpellCatalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8")
  ]);

  console.log(
    JSON.stringify({
      sourcePath: craftedSpellSourcePath,
      catalogPath: craftedSpellCatalogPath,
      totalRecipes: catalog.summary.totalRecipes,
      totalClasses: catalog.summary.totalClasses,
      fetchStrategy: catalog.source.fetchStrategy
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
