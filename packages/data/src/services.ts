import { cacheGet, cacheGetOrResolve } from "./cache";
import { getDb } from "./db";
import { useMockData } from "./env";
import { factions, items, npcs, pets, recipes, spells, spawnGroups, tasks, zones } from "./mock-data";
import { sql } from "kysely";
import type {
  CatalogStats,
  FactionDetail,
  FactionSummary,
  ItemDetail,
  ItemSummary,
  NpcDetail,
  NpcSummary,
  PetDetail,
  PetSummary,
  RecipeDetail,
  RecipeSummary,
  SearchHit,
  SpellDetail,
  SpellSummary,
  SpawnGroupDetail,
  TaskDetail,
  ZoneDetail,
  ZoneSummary
} from "./types";

type ItemFilters = {
  q?: string;
  className?: string;
  slot?: string;
  type?: string;
  tradeable?: boolean;
  minLevel?: number;
  maxLevel?: number;
};
type SpellFilters = { q?: string; className?: string; level?: number; levelMode?: "exact" | "min" | "max" };
type NpcFilters = { q?: string; zone?: string; minLevel?: number; maxLevel?: number; race?: string; named?: boolean };
type ZoneFilters = { q?: string; era?: string };
type RecipeFilters = { q?: string; tradeskill?: string; minTrivial?: number; maxTrivial?: number };
type PetFilters = { className?: string };

type ItemSearchRow = {
  id: number;
  name: string;
  itemclass: number;
  itemtype: number;
  slots: number;
  classes: number;
  nodrop: number;
  reqlevel: number;
  damage: number;
  delay: number;
  source: string | null;
  ac: number;
  hp: number;
  mana: number;
  icon: number;
};

const sourceMode = useMockData() ? "mock" : "hybrid";
const db = getDb();
const databaseEnabled = !useMockData() && Boolean(db);
const itemSearchLimit = 100;
const itemSearchCacheTtlSeconds = 60;

const classNames = [
  "Warrior",
  "Cleric",
  "Paladin",
  "Ranger",
  "Shadow Knight",
  "Druid",
  "Monk",
  "Bard",
  "Rogue",
  "Shaman",
  "Necromancer",
  "Wizard",
  "Magician",
  "Enchanter",
  "Beastlord",
  "Berserker"
] as const;

const classCodes = [
  "WAR",
  "CLR",
  "PAL",
  "RNG",
  "SHD",
  "DRU",
  "MNK",
  "BRD",
  "ROG",
  "SHM",
  "NEC",
  "WIZ",
  "MAG",
  "ENC",
  "BST",
  "BER"
] as const;

const slotFlags: Array<[number, string]> = [
  [1, "Charm"],
  [2, "Ear"],
  [4, "Head"],
  [8, "Face"],
  [16, "Ear"],
  [32, "Neck"],
  [64, "Shoulders"],
  [128, "Arms"],
  [256, "Back"],
  [512, "Wrist"],
  [1024, "Wrist"],
  [2048, "Range"],
  [4096, "Hands"],
  [8192, "Primary"],
  [16384, "Secondary"],
  [32768, "Finger"],
  [65536, "Finger"],
  [131072, "Chest"],
  [262144, "Legs"],
  [524288, "Feet"],
  [1048576, "Waist"],
  [2097152, "Ammo"]
];

const expansionNames: Record<number, string> = {
  0: "Classic",
  1: "Ruins of Kunark",
  2: "Scars of Velious",
  3: "Shadows of Luclin",
  4: "Planes of Power",
  5: "Legacy of Ykesha",
  6: "Lost Dungeons of Norrath",
  7: "Gates of Discord",
  8: "Omens of War",
  9: "Dragons of Norrath",
  10: "Depths of Darkhollow",
  11: "Prophecy of Ro"
};

const raceNames: Record<number, string> = {
  1: "Human",
  2: "Barbarian",
  3: "Erudite",
  4: "Wood Elf",
  5: "High Elf",
  6: "Dark Elf",
  7: "Half Elf",
  8: "Dwarf",
  9: "Troll",
  10: "Ogre",
  11: "Halfling",
  12: "Gnome",
  128: "Iksar",
  130: "Vah Shir",
  330: "Froglok",
  522: "Drakkin"
};

const sizeNames: Record<number, string> = {
  0: "TINY",
  1: "SMALL",
  2: "MEDIUM",
  3: "LARGE",
  4: "GIANT"
};

const skillNames: Record<number, string> = {
  0: "1HS",
  1: "2HS",
  2: "1HP",
  3: "1HB",
  4: "2HB",
  5: "Archery",
  7: "Throwing",
  8: "Shield",
  35: "2HP",
  42: "H2H"
};

const lightNames: Record<number, string> = {
  9: "Light",
  10: "Greater Light",
  11: "Brilliant Light",
  12: "Shiny Light"
};

const effectCastTypes: Record<number, string> = {
  0: "Combat",
  1: "Clicky",
  2: "Clicky",
  3: "Clicky",
  4: "Must Equip. Clicky",
  5: "Inventory Clicky"
};

const twoHandDamageBonuses = [
  0,
  14, 14, 14, 14, 14, 14, 14, 14, 14,
  14, 14, 14, 14, 14, 14, 14, 14, 14, 14,
  14, 14, 14, 14, 14, 14, 14, 14, 35, 35,
  36, 36, 37, 37, 38, 38, 39, 39, 40, 40,
  42, 42, 42, 45, 45, 47, 48, 49, 49, 51,
  51, 52, 53, 54, 54, 56, 56, 57, 58, 59,
  59, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  68, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 80, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 88
];

const npcClassNames: Record<number, string> = {
  1: "Warrior",
  2: "Cleric",
  3: "Paladin",
  4: "Ranger",
  5: "Shadow Knight",
  6: "Druid",
  7: "Monk",
  8: "Bard",
  9: "Rogue",
  10: "Shaman",
  11: "Necromancer",
  12: "Wizard",
  13: "Magician",
  14: "Enchanter",
  15: "Beastlord",
  16: "Berserker",
  41: "Merchant"
};

const spellSkillNames: Record<number, string> = {
  4: "Abjuration",
  5: "Alteration",
  14: "Evocation",
  18: "Conjuration",
  24: "Divination"
};

const resistNames: Record<number, string> = {
  0: "Unresistable",
  1: "Magic",
  2: "Fire",
  3: "Cold",
  4: "Poison",
  5: "Disease",
  6: "Chromatic",
  7: "Prismatic",
  9: "Corruption",
  255: "Beneficial"
};

const targetNames: Record<number, string> = {
  1: "Line of sight",
  2: "Caster",
  3: "Group",
  4: "Point blank AE",
  5: "Single",
  6: "Self",
  8: "Targeted AE",
  14: "Pet"
};

const tradeskillNames: Record<number, string> = {
  56: "Baking",
  57: "Tailoring",
  58: "Blacksmithing",
  59: "Fletching",
  60: "Brewing",
  63: "Jewelry",
  64: "Pottery",
  65: "Research",
  68: "Alchemy",
  69: "Tinkering"
};

function like(query?: string) {
  return `%${query ?? ""}%`;
}

function normalizeText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeNumber(value?: number) {
  return Number.isFinite(value) ? Number(value) : undefined;
}

function normalizeItemFilters(filters: ItemFilters = {}): ItemFilters {
  return {
    q: normalizeText(filters.q),
    className: normalizeText(filters.className),
    slot: normalizeText(filters.slot),
    type: normalizeText(filters.type),
    tradeable: typeof filters.tradeable === "boolean" ? filters.tradeable : undefined,
    minLevel: normalizeNumber(filters.minLevel),
    maxLevel: normalizeNumber(filters.maxLevel)
  };
}

function createItemSearchCacheKey(filters: ItemFilters) {
  return `items:${JSON.stringify({
    q: filters.q ?? "",
    className: filters.className ?? "",
    slot: filters.slot ?? "",
    type: filters.type ?? "",
    tradeable: typeof filters.tradeable === "boolean" ? String(filters.tradeable) : "",
    minLevel: filters.minLevel ?? "",
    maxLevel: filters.maxLevel ?? ""
  })}`;
}

function classMaskForFilter(className?: string) {
  if (!className) return null;

  const index = classNames.findIndex((entry) => entry.toLowerCase() === className.toLowerCase());
  return index >= 0 ? 1 << index : null;
}

function slotMaskForFilter(slot?: string) {
  if (!slot) return null;

  const flags = slotFlags.filter(([, label]) => label.toLowerCase() === slot.toLowerCase()).map(([flag]) => flag);
  return flags.length > 0 ? flags.reduce((sum, flag) => sum | flag, 0) : null;
}

function typeClauseForFilter(type?: string) {
  if (!type) return null;

  switch (type.toLowerCase()) {
    case "weapon":
      return sql`damage > 0`;
    case "1h slashing":
      return sql`damage > 0 and itemtype = 0`;
    case "2h slashing":
      return sql`damage > 0 and itemtype = 1`;
    case "1h piercing":
      return sql`damage > 0 and itemtype = 2`;
    case "1h blunt":
      return sql`damage > 0 and itemtype = 3`;
    case "2h blunt":
      return sql`damage > 0 and itemtype = 4`;
    case "2h piercing":
      return sql`damage > 0 and itemtype = 35`;
    case "hand to hand":
      return sql`damage > 0 and itemtype = 45`;
    case "armor":
      return sql`itemclass = 0 and damage <= 0 and itemtype = 10`;
    case "miscellaneous":
      return sql`itemclass = 0 and damage <= 0 and itemtype = 11`;
    case "food":
      return sql`itemclass = 0 and damage <= 0 and itemtype = 14`;
    case "drink":
      return sql`itemclass = 0 and damage <= 0 and itemtype = 15`;
    case "arrow":
      return sql`itemclass = 0 and damage <= 0 and itemtype = 27`;
    case "jewelry":
      return sql`itemclass = 0 and damage <= 0 and itemtype = 29`;
    case "potion":
      return sql`itemclass = 0 and damage <= 0 and itemtype = 42`;
    case "augment":
      return sql`itemclass = 0 and damage <= 0 and itemtype = 54`;
    case "container":
      return sql`itemclass = 1`;
    case "book":
      return sql`itemclass = 2`;
    default:
      return null;
  }
}

function itemMatchesFilters(item: ItemSummary, filters: ItemFilters) {
  if (!includesFolded(item.name, filters.q)) return false;
  if (filters.className && !item.classes.some((klass) => includesFolded(klass, filters.className))) return false;
  if (filters.slot && !includesFolded(item.slot, filters.slot)) return false;
  if (filters.type && !includesFolded(item.type, filters.type)) return false;
  if (typeof filters.tradeable === "boolean" && item.tradeable !== filters.tradeable) return false;
  if (filters.minLevel && item.levelRequired < filters.minLevel) return false;
  if (filters.maxLevel && item.levelRequired > filters.maxLevel) return false;
  return true;
}

function decodeClassMask(mask: number | null | undefined) {
  if (!mask || mask <= 0 || mask >= 65535) {
    return ["All"];
  }

  const classes = classNames.filter((_, index) => (mask & (1 << index)) !== 0);
  return classes.length > 0 ? [...classes] : ["All"];
}

function formatClassMask(mask: number | null | undefined) {
  if (!mask || mask <= 0 || mask >= 65535) {
    return "ALL";
  }

  const classes = classCodes.filter((_, index) => (mask & (1 << index)) !== 0);
  return classes.length > 0 ? classes.join(" ") : "ALL";
}

function formatRaceMask(mask: number | null | undefined) {
  if (!mask || mask <= 0 || mask >= 65535) {
    return "ALL";
  }

  const races = Object.entries(raceNames)
    .filter(([flag]) => (mask & Number(flag)) !== 0)
    .map(([, label]) => label);

  return races.length > 0 ? races.join(", ") : "ALL";
}

function formatSlotList(mask: number | null | undefined, itemClass: number | null | undefined) {
  if (itemClass && itemClass !== 0) {
    return "Inventory";
  }

  const slots = slotFlags.filter(([flag]) => ((mask ?? 0) & flag) !== 0).map(([, label]) => label);
  const unique = [...new Set(slots)];
  return unique.length > 0 ? unique.join(", ") : "Inventory";
}

function formatSlotMask(mask: number | null | undefined, itemClass: number | null | undefined) {
  if (itemClass && itemClass !== 0) {
    return "Inventory";
  }

  const slots = slotFlags.filter(([flag]) => ((mask ?? 0) & flag) !== 0).map(([, label]) => label);
  const unique = [...new Set(slots)];
  if (unique.length === 0) return "Inventory";
  if (unique.length > 2) return `${unique[0]} / ${unique[1]}`;
  return unique.join(" / ");
}

function formatItemType(itemClass: number | null | undefined, itemType: number | null | undefined, damage?: number | null) {
  if (itemClass === 1) return "Container";
  if (itemClass === 2) return "Book";
  if ((damage ?? 0) > 0) {
    const weaponTypes: Record<number, string> = {
      0: "1H Slashing",
      1: "2H Slashing",
      2: "1H Piercing",
      3: "1H Blunt",
      4: "2H Blunt",
      35: "2H Piercing",
      45: "Hand to Hand"
    };
    return weaponTypes[itemType ?? -1] ?? "Weapon";
  }

  const itemTypes: Record<number, string> = {
    10: "Armor",
    11: "Miscellaneous",
    14: "Food",
    15: "Drink",
    27: "Arrow",
    29: "Jewelry",
    42: "Potion",
    54: "Augment"
  };
  return itemTypes[itemType ?? -1] ?? "Item";
}

function formatExpansion(expansion: number | null | undefined) {
  return expansionNames[expansion ?? 0] ?? `Expansion ${expansion ?? 0}`;
}

function formatWeight(weight: number | null | undefined) {
  const normalized = Number(weight ?? 0) / 10;
  return normalized % 1 === 0 ? String(normalized.toFixed(0)) : String(normalized);
}

function formatSize(size: number | null | undefined) {
  return sizeNames[size ?? 2] ?? "MEDIUM";
}

function formatSkill(itemType: number | null | undefined, damage: number | null | undefined, itemClass: number | null | undefined) {
  if (itemClass && itemClass !== 0) {
    return "Container";
  }

  if ((damage ?? 0) <= 0) {
    return formatItemType(itemClass, itemType, damage);
  }

  return skillNames[itemType ?? -1] ?? formatItemType(itemClass, itemType, damage);
}

function formatItemTypeLabel(
  itemType: number | null | undefined,
  damage: number | null | undefined,
  itemClass: number | null | undefined,
  light: number | null | undefined
) {
  if ((damage ?? 0) > 0) {
    return formatItemType(itemClass, itemType, damage);
  }

  if ((light ?? 0) > 0) {
    return lightNames[Number(light)] ?? "Light";
  }

  return formatItemType(itemClass, itemType, damage);
}

function calculateDamageBonus(itemType: number | null | undefined, damage: number | null | undefined, delay: number | null | undefined) {
  if ((damage ?? 0) <= 0) {
    return 0;
  }

  if ([0, 2, 3, 42].includes(itemType ?? -1)) {
    return 13;
  }

  if ([1, 4, 35].includes(itemType ?? -1)) {
    return twoHandDamageBonuses[Number(delay ?? 0)] ?? 0;
  }

  return 0;
}

function formatCoinValue(price: number | null | undefined) {
  const totalCopper = Math.max(0, Number(price ?? 0));
  return {
    pp: Math.floor(totalCopper / 1000),
    gp: Math.floor((totalCopper % 1000) / 100),
    sp: Math.floor((totalCopper % 100) / 10),
    cp: totalCopper % 10
  };
}

function formatRace(race: number | null | undefined) {
  return raceNames[race ?? -1] ?? `Race ${race ?? "?"}`;
}

function formatNpcClass(klass: number | null | undefined) {
  return npcClassNames[klass ?? -1] ?? `Class ${klass ?? "?"}`;
}

function formatSpellSkill(skill: number | null | undefined) {
  return spellSkillNames[skill ?? -1] ?? `Skill ${skill ?? 0}`;
}

function formatResist(resist: number | null | undefined) {
  return resistNames[resist ?? -1] ?? `Resist ${resist ?? 0}`;
}

function formatTarget(target: number | null | undefined) {
  return targetNames[target ?? -1] ?? `Target ${target ?? 0}`;
}

function formatTradeskill(tradeskill: number | null | undefined) {
  return tradeskillNames[tradeskill ?? -1] ?? `Tradeskill ${tradeskill ?? 0}`;
}

function classIdFromName(className?: string) {
  if (!className) return 0;
  const index = classNames.findIndex((entry) => entry.toLowerCase() === className.toLowerCase());
  return index >= 0 ? index + 1 : 0;
}

function formatLevelRange(minLevel: number | null | undefined, maxLevel: number | null | undefined) {
  if (minLevel && maxLevel && minLevel !== maxLevel) return `${minLevel} - ${maxLevel}`;
  if (minLevel) return String(minLevel);
  if (maxLevel) return String(maxLevel);
  return "All levels";
}

function isNamedNpcName(name: string) {
  const lower = name.trim().toLowerCase();
  return !(lower.startsWith("a ") || lower.startsWith("an ") || lower.startsWith("the "));
}

function formatNpcName(name: string) {
  return name
    .replace(/[#!~]/g, "")
    .replace(/_/g, " ")
    .replace(/\d+/g, "")
    .trim();
}

function spellClassesFromRow(row: Record<string, unknown>) {
  return classNames
    .map((klass, index) => ({ klass, level: Number(row[`classes${index + 1}`] ?? 255) }))
    .filter((entry) => entry.level > 0 && entry.level < 255);
}

async function withDatabaseFallback<T>(run: () => Promise<T>, fallback: () => T | Promise<T>) {
  if (!databaseEnabled || !db) {
    return fallback();
  }

  try {
    return await run();
  } catch {
    return fallback();
  }
}

function includesFolded(value: string, query?: string) {
  if (!query) return true;
  return value.toLowerCase().includes(query.toLowerCase());
}

function numberFromLevelRange(level: string) {
  const digits = level.match(/\d+/g);
  return digits ? Number(digits[0]) : 0;
}

async function spellNamesById(ids: number[]) {
  if (!db || ids.length === 0) {
    return new Map<number, string>();
  }

  const uniqueIds = [...new Set(ids.filter((id) => id > 0 && id < 65535))];
  if (uniqueIds.length === 0) {
    return new Map<number, string>();
  }

  const rows = await sql<{ id: number; name: string }>`
    select id, name
    from spells_new
    where id in (${sql.join(uniqueIds)})
  `.execute(db);

  return new Map(rows.rows.map((row) => [row.id, row.name]));
}

function summarizeItems(): ItemSummary[] {
  return items.map(({ id, name, icon, type, slot, classes, tradeable, levelRequired, zone, stats }) => ({
    id,
    name,
    icon,
    type,
    slot,
    classes,
    tradeable,
    levelRequired,
    zone,
    ac: Number(stats.find((entry) => entry.label === "Armor Class")?.value ?? 0),
    hp: Number(String(stats.find((entry) => entry.label === "Hit Points")?.value ?? 0).replace(/^\+/, "")),
    mana: Number(String(stats.find((entry) => entry.label === "Mana")?.value ?? 0).replace(/^\+/, "")),
    damage: Number((stats.find((entry) => entry.label === "Damage / Delay")?.value ?? "0 / 0").split("/")[0]?.trim() ?? 0),
    delay: Number((stats.find((entry) => entry.label === "Damage / Delay")?.value ?? "0 / 0").split("/")[1]?.trim() ?? 0)
  }));
}

function mapItemRowToSummary(row: ItemSearchRow): ItemSummary {
  return {
    id: row.id,
    name: row.name,
    icon: String(row.icon ?? 0),
    type: formatItemType(row.itemclass, row.itemtype, row.damage),
    slot: formatSlotMask(row.slots, row.itemclass),
    classes: decodeClassMask(row.classes),
    tradeable: Number(row.nodrop ?? 0) === 0,
    levelRequired: Number(row.reqlevel ?? 0),
    zone: row.source?.trim() || "Various",
    ac: Number(row.ac ?? 0),
    hp: Number(row.hp ?? 0),
    mana: Number(row.mana ?? 0),
    damage: Number(row.damage ?? 0),
    delay: Number(row.delay ?? 0)
  };
}

function buildItemFilterClauses(filters: ItemFilters) {
  const clauses = [sql`1 = 1`];

  if (typeof filters.tradeable === "boolean") {
    clauses.push(filters.tradeable ? sql`nodrop = 0` : sql`nodrop <> 0`);
  }

  if (filters.minLevel) {
    clauses.push(sql`reqlevel >= ${filters.minLevel}`);
  }

  if (filters.maxLevel) {
    clauses.push(sql`reqlevel <= ${filters.maxLevel}`);
  }

  const classMask = classMaskForFilter(filters.className);
  if (classMask) {
    clauses.push(sql`(classes <= 0 or classes >= 65535 or (classes & ${classMask}) <> 0)`);
  }

  if (filters.slot) {
    if (filters.slot.toLowerCase() === "inventory") {
      clauses.push(sql`(itemclass <> 0 or slots = 0)`);
    } else {
      const slotMask = slotMaskForFilter(filters.slot);
      if (slotMask) {
        clauses.push(sql`itemclass = 0 and (slots & ${slotMask}) <> 0`);
      }
    }
  }

  const typeClause = typeClauseForFilter(filters.type);
  if (typeClause) {
    clauses.push(typeClause);
  }

  return clauses;
}

async function fetchItemCandidateIds(filters: ItemFilters, limit: number) {
  if (!db) {
    return [];
  }

  const clauses = [...buildItemFilterClauses(filters)];

  if (filters.q) {
    clauses.push(sql`Name like ${like(filters.q)}`);
  }

  const result = await sql<{ id: number }>`
    select id
    from items
    where ${sql.join(clauses, sql` and `)}
    order by ${filters.q ? sql`Name asc` : sql`id asc`}
    limit ${limit}
  `.execute(db);

  return result.rows.map((row) => row.id);
}

async function fetchItemsByIds(ids: number[]) {
  if (!db || ids.length === 0) {
    return [];
  }

  const rows = await sql<ItemSearchRow>`
    select id, Name as name, itemclass, itemtype, slots, classes, nodrop, reqlevel, damage, delay, source, ac, hp, mana, icon
    from items
    where id in (${sql.join(ids)})
  `.execute(db);

  const byId = new Map(rows.rows.map((row) => [row.id, mapItemRowToSummary(row)]));
  return ids.map((id) => byId.get(id)).filter((item): item is ItemSummary => Boolean(item));
}

function rankItemSearchResults(items: ItemSummary[], query?: string) {
  if (!query) {
    return items;
  }

  const loweredQuery = query.toLowerCase();

  const ranked = [...items];
  ranked.sort((left, right) => {
    const leftName = left.name.toLowerCase();
    const rightName = right.name.toLowerCase();
    const leftScore = leftName === loweredQuery ? 0 : leftName.startsWith(loweredQuery) ? 1 : 2;
    const rightScore = rightName === loweredQuery ? 0 : rightName.startsWith(loweredQuery) ? 1 : 2;

    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }

    return left.name.localeCompare(right.name);
  });

  return ranked;
}

function summarizeSpells(): SpellSummary[] {
  return spells.map(({ id, name, icon, classes, classLevel, level, skill, effect, mana, target }) => ({
    id,
    name,
    icon,
    classes,
    classLevel,
    level,
    skill,
    effect,
    mana,
    target
  }));
}

function summarizeNpcs(): NpcSummary[] {
  return npcs.map(({ id, name, race, klass, level, zone, named }) => ({
    id,
    name: formatNpcName(name),
    race,
    klass,
    level,
    zone,
    named
  }));
}

function summarizeZones(): ZoneSummary[] {
  return zones.map(({ id, shortName, longName, spawns, era, levelRange, population }) => ({
    id,
    shortName,
    longName,
    spawns,
    era,
    levelRange,
    population
  }));
}

function summarizeFactions(): FactionSummary[] {
  return factions.map(({ id, name, category, alignedZone }) => ({
    id,
    name,
    category,
    alignedZone
  }));
}

function summarizeRecipes(): RecipeSummary[] {
  return recipes.map(({ id, name, tradeskill, trivial, result }) => ({
    id,
    name,
    tradeskill,
    trivial,
    result
  }));
}

export function getSourceMode() {
  return sourceMode;
}

export async function getCatalogStats(): Promise<CatalogStats> {
  return withDatabaseFallback(async () => {
    const result = await sql<{
      items: number;
      spells: number;
      npcs: number;
      zones: number;
      factions: number;
      recipes: number;
      pets: number;
      tasks: number;
    }>`
      select
        (select count(*) from items) as items,
        (select count(*) from spells_new) as spells,
        (select count(*) from npc_types) as npcs,
        (select count(*) from zone) as zones,
        (select count(*) from faction_list) as factions,
        (select count(*) from tradeskill_recipe) as recipes,
        (select count(*) from pets) as pets,
        (select count(*) from tasks) as tasks
    `.execute(db!);

    const row = result.rows[0];

    return {
      items: Number(row.items),
      spells: Number(row.spells),
      npcs: Number(row.npcs),
      zones: Number(row.zones),
      factions: Number(row.factions),
      recipes: Number(row.recipes),
      pets: Number(row.pets),
      tasks: Number(row.tasks)
    };
  }, () => ({
    items: items.length,
    spells: spells.length,
    npcs: npcs.length,
    zones: zones.length,
    factions: factions.length,
    recipes: recipes.length,
    pets: pets.length,
    tasks: tasks.length
  }));
}

export async function searchCatalog(query: string): Promise<SearchHit[]> {
  const key = `search:${query.toLowerCase()}`;
  const cached = await cacheGet<SearchHit[]>(key);

  if (cached) {
    return cached;
  }

  return cacheGetOrResolve(key, 60, async () =>
    withDatabaseFallback(async () => {
      const [itemRows, spellRows, npcRows, zoneRows, factionRows, recipeRows] = await Promise.all([
        sql<{ id: number; name: string; icon: number; itemclass: number; itemtype: number; slots: number; damage: number }>`
          select id, Name as name, icon, itemclass, itemtype, slots, damage
          from items
          where Name like ${like(query)}
          order by Name asc
          limit 8
        `.execute(db!),
        sql<Record<string, unknown>>`
          select id, name, new_icon, skill, cast_on_you, classes1, classes2, classes3, classes4, classes5, classes6, classes7, classes8,
                 classes9, classes10, classes11, classes12, classes13, classes14, classes15, classes16
          from spells_new
          where name like ${like(query)}
          order by name asc
          limit 8
        `.execute(db!),
        sql<{ id: number; name: string; race: number; level: number; zone_name: string | null }>`
          select nt.id, nt.name, nt.race, nt.level, min(z.long_name) as zone_name
          from npc_types nt
          left join spawnentry se on se.npcID = nt.id
          left join spawngroup sg on sg.id = se.spawngroupID
          left join spawn2 s2 on s2.spawngroupID = sg.id
          left join zone z on z.short_name = s2.zone and z.version = s2.version
          where nt.name like ${like(query)}
          group by nt.id, nt.name, nt.race, nt.level
          order by nt.name asc
          limit 8
        `.execute(db!),
        sql<{ short_name: string; long_name: string; expansion: number; min_level: number; max_level: number }>`
          select short_name, long_name, expansion, min_level, max_level
          from zone
          where short_name like ${like(query)} or long_name like ${like(query)}
          order by long_name asc
          limit 8
        `.execute(db!),
        sql<{ id: number; name: string }>`
          select id, name
          from faction_list
          where name like ${like(query)}
          order by name asc
          limit 8
        `.execute(db!),
        sql<{ id: number; name: string; tradeskill: number; trivial: number }>`
          select id, name, tradeskill, trivial
          from tradeskill_recipe
          where name like ${like(query)}
          order by name asc
          limit 8
        `.execute(db!)
      ]);

      const dbHits: SearchHit[] = [];

      for (const row of itemRows.rows) {
        dbHits.push({
          id: String(row.id),
          type: "item",
          title: row.name,
          href: `/items/${row.id}`,
          subtitle: `${formatItemType(row.itemclass, row.itemtype, row.damage)} • ${formatSlotMask(row.slots, row.itemclass)}`,
          tags: [],
          icon: String(row.icon ?? 0)
        });
      }

      for (const row of spellRows.rows) {
        const classes = spellClassesFromRow(row);
        const primaryClass = classes[0];
        dbHits.push({
          id: String(row.id),
          type: "spell",
          title: String(row.name),
          href: `/spells/${row.id}`,
          subtitle: String(row.cast_on_you || `${formatSpellSkill(Number(row.skill ?? 0))} spell`),
          tags: primaryClass ? [`${primaryClass.klass} ${primaryClass.level}`] : classes.slice(0, 3).map((entry) => entry.klass),
          icon: String(row.new_icon ?? 0)
        });
      }

      for (const row of npcRows.rows) {
        dbHits.push({
          id: String(row.id),
          type: "npc",
          title: formatNpcName(row.name),
          href: `/npcs/${row.id}`,
          subtitle: `${formatRace(row.race)} • ${row.level}`,
          tags: [row.zone_name ?? "Unknown", isNamedNpcName(row.name) ? "Named" : "Common"]
        });
      }

      for (const row of zoneRows.rows) {
        dbHits.push({
          id: row.short_name,
          type: "zone",
          title: row.long_name,
          href: `/zones/${row.short_name}`,
          subtitle: `${formatExpansion(row.expansion)} • ${formatLevelRange(row.min_level, row.max_level)}`,
          tags: []
        });
      }

      for (const row of factionRows.rows) {
        dbHits.push({
          id: String(row.id),
          type: "faction",
          title: row.name,
          href: `/factions/${row.id}`,
          subtitle: `Faction ${row.id}`,
          tags: []
        });
      }

      for (const row of recipeRows.rows) {
        dbHits.push({
          id: String(row.id),
          type: "recipe",
          title: row.name,
          href: `/recipes/${row.id}`,
          subtitle: `${formatTradeskill(row.tradeskill)} • Trivial ${row.trivial}`,
          tags: []
        });
      }

      return dbHits;
    }, async () => {
      const fallbackHits: SearchHit[] = [];
      for (const item of summarizeItems()) {
        if (includesFolded(item.name, query)) fallbackHits.push({ id: String(item.id), type: "item", title: item.name, href: `/items/${item.id}`, subtitle: `${item.type} • ${item.slot}`, tags: [item.zone], icon: item.icon });
      }
      for (const spell of summarizeSpells()) {
        if (includesFolded(spell.name, query) || includesFolded(spell.effect, query)) {
          fallbackHits.push({
            id: String(spell.id),
            type: "spell",
            title: spell.name,
            href: `/spells/${spell.id}`,
            subtitle: spell.effect,
            tags: [spell.classLevel],
            icon: spell.icon
          });
        }
      }
      for (const npc of summarizeNpcs()) {
        if (includesFolded(npc.name, query)) fallbackHits.push({ id: String(npc.id), type: "npc", title: npc.name, href: `/npcs/${npc.id}`, subtitle: `${npc.race} • ${npc.level}`, tags: [npc.zone, npc.named ? "Named" : "Common"] });
      }
      for (const zone of summarizeZones()) {
        if (includesFolded(zone.longName, query) || includesFolded(zone.shortName, query)) fallbackHits.push({ id: zone.shortName, type: "zone", title: zone.longName, href: `/zones/${zone.shortName}`, subtitle: `${zone.era} • ${zone.levelRange}`, tags: [zone.population] });
      }
      for (const faction of summarizeFactions()) {
        if (includesFolded(faction.name, query)) fallbackHits.push({ id: String(faction.id), type: "faction", title: faction.name, href: `/factions/${faction.id}`, subtitle: `Faction ${faction.id}`, tags: [] });
      }
      for (const recipe of summarizeRecipes()) {
        if (includesFolded(recipe.name, query)) fallbackHits.push({ id: String(recipe.id), type: "recipe", title: recipe.name, href: `/recipes/${recipe.id}`, subtitle: `${recipe.tradeskill} • Trivial ${recipe.trivial}`, tags: [] });
      }
      return fallbackHits;
    })
  );
}

export async function listItems(filters: ItemFilters = {}) {
  const normalizedFilters = normalizeItemFilters(filters);
  const key = createItemSearchCacheKey(normalizedFilters);
  const cached = await cacheGet<ItemSummary[]>(key);

  if (cached) {
    return cached;
  }

  return cacheGetOrResolve(key, itemSearchCacheTtlSeconds, async () =>
    withDatabaseFallback(async () => {
      const candidateIds = await fetchItemCandidateIds(normalizedFilters, itemSearchLimit);
      const hydrated = await fetchItemsByIds(candidateIds);
      return rankItemSearchResults(
        hydrated.filter((item) => itemMatchesFilters(item, normalizedFilters)),
        normalizedFilters.q
      );
    }, () =>
      rankItemSearchResults(
        summarizeItems().filter((item) => itemMatchesFilters(item, normalizedFilters)).slice(0, itemSearchLimit),
        normalizedFilters.q
      ))
  );
}

export async function getItemDetail(id: number): Promise<ItemDetail | undefined> {
  return withDatabaseFallback(async () => {
    const result = await sql<{
      id: number;
      name: string;
      itemclass: number;
      itemtype: number;
      slots: number;
      classes: number;
      races: number;
      nodrop: number;
      attuneable: number;
      magic: number;
      reqlevel: number;
      reclevel: number;
      damage: number;
      delay: number;
      item_range: number;
      attack: number;
      haste: number;
      hp: number;
      mana: number;
      endur: number;
      regen: number;
      manaregen: number;
      enduranceregen: number;
      ac: number;
      astr: number;
      asta: number;
      aagi: number;
      adex: number;
      aint: number;
      awis: number;
      acha: number;
      mr: number;
      fr: number;
      cr: number;
      dr: number;
      pr: number;
      augslot1type: number;
      augslot1visible: number;
      augslot2type: number;
      augslot2visible: number;
      augslot3type: number;
      augslot3visible: number;
      augslot4type: number;
      augslot4visible: number;
      augslot5type: number;
      augslot5visible: number;
      augslot6type: number;
      augslot6visible: number;
      proceffect: number;
      proclevel2: number;
      procrate: number;
      worneffect: number;
      wornlevel: number;
      focuseffect: number;
      focuslevel: number;
      clickeffect: number;
      clicklevel2: number;
      clicktype: number;
      lore: string | null;
      source: string | null;
      size: number;
      weight: number;
      light: number;
      price: number;
      icon: number;
    }>`
      select id, Name as name, itemclass, itemtype, slots, classes, races, nodrop, attuneable, magic, reqlevel, reclevel,
             damage, delay, ${sql.raw("`range`")} as item_range, attack, haste, hp, mana, endur, regen, manaregen, enduranceregen, ac,
             astr, asta, aagi, adex, aint, awis, acha, mr, fr, cr, dr, pr,
             augslot1type, augslot1visible, augslot2type, augslot2visible, augslot3type, augslot3visible,
             augslot4type, augslot4visible, augslot5type, augslot5visible, augslot6type, augslot6visible,
             proceffect, proclevel2, procrate, worneffect, wornlevel, focuseffect, focuslevel, clickeffect, clicklevel2, clicktype,
             lore, source, size, weight, light, price, icon
      from items where id = ${id}
    `.execute(db!);

    const row = result.rows[0];

    if (!row) return undefined;

    const droppedByRowsPromise = sql<{ id: number; name: string }>`
      select distinct nt.id, nt.name
      from lootdrop_entries lde
      join loottable_entries lte on lte.lootdrop_id = lde.lootdrop_id
      join npc_types nt on nt.loottable_id = lte.loottable_id
      where lde.item_id = ${id}
      order by nt.name asc
      limit 40
    `.execute(db!);

    const droppedZoneRowsPromise = sql<{ short_name: string; long_name: string }>`
      select distinct z.short_name, z.long_name
      from lootdrop_entries lde
      join loottable_entries lte on lte.lootdrop_id = lde.lootdrop_id
      join npc_types nt on nt.loottable_id = lte.loottable_id
      join spawnentry se on se.npcID = nt.id
      join spawngroup sg on sg.id = se.spawngroupID
      join spawn2 s2 on s2.spawngroupID = sg.id
      join zone z on z.short_name = s2.zone and z.version = s2.version
      where lde.item_id = ${id}
      order by z.long_name asc
      limit 20
    `.execute(db!);

    const soldByRowsPromise = sql<{ id: number; name: string }>`
      select distinct nt.id, nt.name
      from merchantlist ml
      join npc_types nt on nt.merchant_id = ml.merchantid
      where ml.item = ${id}
      order by nt.name asc
      limit 40
    `.execute(db!);

    const recipeRowsPromise = sql<{ id: number; name: string }>`
      select distinct tr.id, tr.name
      from tradeskill_recipe_entries tre
      join tradeskill_recipe tr on tr.id = tre.recipe_id
      where tre.item_id = ${id}
      order by tr.name asc
      limit 40
    `.execute(db!);

    const effectNameMapPromise = spellNamesById([row.proceffect, row.worneffect, row.focuseffect, row.clickeffect].map(Number));

    const [droppedByRows, droppedZoneRows, soldByRows, recipeRows, effectNameMap] = await Promise.all([
      droppedByRowsPromise,
      droppedZoneRowsPromise,
      soldByRowsPromise,
      recipeRowsPromise,
      effectNameMapPromise
    ]);

    const statPairs: Array<[string, string | number | null | undefined]> = [
      ["AC", row.ac],
      ["HP", row.hp],
      ["Mana", row.mana],
      ["End", row.endur],
      ["Attack", row.attack],
      ["Haste", row.haste ? `${row.haste}%` : 0],
      ["Strength", row.astr],
      ["Stamina", row.asta],
      ["Agility", row.aagi],
      ["Dexterity", row.adex],
      ["Intelligence", row.aint],
      ["Wisdom", row.awis],
      ["Charisma", row.acha],
      ["Magic Resist", row.mr],
      ["Fire Resist", row.fr],
      ["Cold Resist", row.cr],
      ["Disease Resist", row.dr],
      ["Poison Resist", row.pr],
      ["HP Regen", row.regen],
      ["Mana Regen", row.manaregen],
      ["Damage / Delay", row.damage && row.delay ? `${row.damage} / ${row.delay}` : 0]
    ];

    const stats: Array<{ label: string; value: string }> = statPairs
      .filter(([, value]) => {
        if (typeof value === "string" && value.includes("/")) {
          return true;
        }
        return Number(value) !== 0;
      })
      .map(([label, value]) => ({ label, value: String(value) }));

    const flags = [
      Number(row.magic ?? 0) > 0 ? "Magic" : null,
      Number(row.nodrop ?? 0) > 0 ? "No Drop" : null,
      Number(row.attuneable ?? 0) > 0 ? "Attuneable" : null
    ].filter((value): value is string => Boolean(value));

    const augmentSlots = Array.from({ length: 6 }, (_, index) => index + 1)
      .map((slot) => ({
        slot,
        type: Number(row[`augslot${slot}type` as keyof typeof row] ?? 0),
        visible: Number(row[`augslot${slot}visible` as keyof typeof row] ?? 0)
      }))
      .filter((entry) => entry.visible > 0 && entry.type > 0)
      .map(({ slot, type }) => ({ slot, type }));

    const buildEffect = (
      effectId: number | null | undefined,
      labelLevel: number | null | undefined,
      extra?: { chanceModifier?: number; castType?: string }
    ) => {
      const normalizedId = Number(effectId ?? 0);
      if (normalizedId <= 0 || normalizedId >= 65535) {
        return undefined;
      }

      return {
        id: normalizedId,
        name: effectNameMap.get(normalizedId) ?? `Spell ${normalizedId}`,
        href: `/spells/${normalizedId}`,
        level: Number(labelLevel ?? 0) > 0 ? Number(labelLevel) : undefined,
        chanceModifier: extra?.chanceModifier,
        castType: extra?.castType
      };
    };

    const coinValue = formatCoinValue(row.price);

    const detail: ItemDetail = {
      id: row.id,
      name: row.name,
      icon: String(row.icon ?? 0),
      type: formatItemType(row.itemclass, row.itemtype, row.damage),
      slot: formatSlotMask(row.slots, row.itemclass),
      classes: decodeClassMask(row.classes),
      flags,
      classDisplay: formatClassMask(row.classes),
      raceDisplay: formatRaceMask(row.races),
      slotDisplay: formatSlotList(row.slots, row.itemclass),
      size: formatSize(row.size),
      weight: formatWeight(row.weight),
      skill: formatSkill(row.itemtype, row.damage, row.itemclass),
      itemTypeLabel: formatItemTypeLabel(row.itemtype, row.damage, row.itemclass, row.light),
      tradeable: Number(row.nodrop ?? 0) === 0,
      levelRequired: Number(row.reqlevel ?? 0),
      recommendedLevel: Number(row.reclevel ?? 0),
      range: Number(row.item_range ?? 0),
      attack: Number(row.attack ?? 0),
      haste: Number(row.haste ?? 0),
      endurance: Number(row.endur ?? 0),
      hpRegen: Number(row.regen ?? 0),
      manaRegen: Number(row.manaregen ?? 0),
      enduranceRegen: Number(row.enduranceregen ?? 0),
      damageBonus: calculateDamageBonus(row.itemtype, row.damage, row.delay),
      coinValue,
      zone: droppedZoneRows.rows[0]?.long_name ?? (row.source?.trim() || "Various"),
      ac: Number(row.ac ?? 0),
      hp: Number(row.hp ?? 0),
      mana: Number(row.mana ?? 0),
      damage: Number(row.damage ?? 0),
      delay: Number(row.delay ?? 0),
      lore: row.lore?.trim() || "No lore text available.",
      augmentSlots,
      droppedInZones: droppedZoneRows.rows.map((entry) => ({
        shortName: entry.short_name,
        longName: entry.long_name,
        href: `/zones/${entry.short_name}`
      })),
      combatEffect: buildEffect(row.proceffect, row.proclevel2, { chanceModifier: 100 + Number(row.procrate ?? 0) }),
      wornEffect: buildEffect(row.worneffect, row.wornlevel),
      focusEffect: buildEffect(row.focuseffect, row.focuslevel),
      clickEffect: buildEffect(row.clickeffect, row.clicklevel2, { castType: effectCastTypes[Number(row.clicktype ?? 0)] }),
      stats,
      droppedBy: droppedByRows.rows.map((entry) => ({ id: entry.id, name: entry.name, href: `/npcs/${entry.id}` })),
      soldBy: soldByRows.rows.map((entry) => ({ id: entry.id, name: entry.name, href: `/npcs/${entry.id}` })),
      usedInRecipes: recipeRows.rows.map((entry) => ({ id: entry.id, name: entry.name, href: `/recipes/${entry.id}` }))
    };
    detail.stats.push({ label: "Value", value: `${coinValue.pp}pp ${coinValue.gp}gp ${coinValue.sp}sp ${coinValue.cp}cp` });

    return detail;
  }, () => items.find((item) => item.id === id));
}

export async function listSpells(filters: SpellFilters = {}) {
  return withDatabaseFallback(async () => {
    const rows = await sql<Record<string, unknown>>`
      select id, name, new_icon, skill, effectid1, cast_on_you, mana, targettype, classes1, classes2, classes3, classes4, classes5, classes6, classes7, classes8,
             classes9, classes10, classes11, classes12, classes13, classes14, classes15, classes16
      from spells_new
      where name like ${like(filters.q)}
      order by name asc
      limit 100
    `.execute(db!);

    return rows.rows
      .map((row) => {
        const classes = spellClassesFromRow(row);
        const primaryClass =
          classes.find((entry) => (filters.className ? includesFolded(entry.klass, filters.className) : true)) ?? classes[0];
        return {
          id: Number(row.id),
          name: String(row.name),
          icon: String(row.new_icon ?? 0),
          classes: classes.map((entry) => entry.klass),
          classLevel: primaryClass ? `${primaryClass.klass} ${primaryClass.level}` : "Unknown",
          level: primaryClass?.level ?? Math.min(...classes.map((entry) => entry.level), 255),
          skill: formatSpellSkill(Number(row.skill ?? 0)),
          effect: String(row.cast_on_you || `Effect ${Number(row.effectid1 ?? 0)}`),
          mana: Number(row.mana ?? 0),
          target: formatTarget(Number(row.targettype ?? 0))
        };
      })
      .filter((spell) => {
        if (filters.className && !spell.classes.some((klass) => includesFolded(klass, filters.className))) return false;
        if (filters.level) {
          if (filters.levelMode === "min" && spell.level < filters.level) return false;
          else if (filters.levelMode === "max" && spell.level > filters.level) return false;
          else if ((!filters.levelMode || filters.levelMode === "exact") && spell.level !== filters.level) return false;
        }
        return true;
      });
  }, () => summarizeSpells().filter((spell) => {
    if (!includesFolded(spell.name, filters.q)) return false;
    if (filters.className && !spell.classes.some((klass) => includesFolded(klass, filters.className))) return false;
    if (filters.level) {
      if (filters.levelMode === "min" && spell.level < filters.level) return false;
      else if (filters.levelMode === "max" && spell.level > filters.level) return false;
      else if ((!filters.levelMode || filters.levelMode === "exact") && spell.level !== filters.level) return false;
    }
    return true;
  }));
}

export async function getSpellDetail(id: number): Promise<SpellDetail | undefined> {
  return withDatabaseFallback(async () => {
    const result = await sql<Record<string, unknown>>`
      select id, name, new_icon, skill, effectid1, mana, targettype, buffduration, resisttype, cast_on_you,
             classes1, classes2, classes3, classes4, classes5, classes6, classes7, classes8,
             classes9, classes10, classes11, classes12, classes13, classes14, classes15, classes16
      from spells_new
      where id = ${id}
    `.execute(db!);

    const row = result.rows[0];

    if (!row) return undefined;

    const classes = spellClassesFromRow(row);
    return {
      id: Number(row.id),
      name: String(row.name),
      icon: String(row.new_icon ?? 0),
      classes: classes.map((entry) => entry.klass),
      classLevel: classes[0] ? `${classes[0].klass} ${classes[0].level}` : "Unknown",
      level: Math.min(...classes.map((entry) => entry.level), 255),
      skill: formatSpellSkill(Number(row.skill ?? 0)),
      effect: String(row.cast_on_you || `Effect ${Number(row.effectid1 ?? 0)}`),
      mana: Number(row.mana ?? 0),
      target: formatTarget(Number(row.targettype ?? 0)),
      duration: Number(row.buffduration ?? 0) > 0 ? `${row.buffduration} ticks` : "Instant",
      resist: formatResist(Number(row.resisttype ?? 255)),
      description: String(row.cast_on_you || `Spell effect ${row.effectid1 ?? 0}`)
    };
  }, () => spells.find((spell) => spell.id === id));
}

export async function listNpcs(filters: NpcFilters = {}) {
  return withDatabaseFallback(async () => {
    const rows = await sql<{ id: number; name: string; race: number; level: number; class: number; zone_name: string | null }>`
      select nt.id, nt.name, nt.race, nt.level, nt.class, min(z.long_name) as zone_name
      from npc_types nt
      left join spawnentry se on se.npcID = nt.id
      left join spawngroup sg on sg.id = se.spawngroupID
      left join spawn2 s2 on s2.spawngroupID = sg.id
      left join zone z on z.short_name = s2.zone and z.version = s2.version
      where nt.name like ${like(filters.q)}
      group by nt.id, nt.name, nt.race, nt.level, nt.class
      order by nt.level desc, nt.name asc
      limit 100
    `.execute(db!);

    return rows.rows
      .map((row) => ({
        id: row.id,
        name: formatNpcName(row.name),
        race: formatRace(row.race),
        klass: formatNpcClass(row.class),
        level: String(row.level),
        zone: row.zone_name ?? "Unknown",
        named: isNamedNpcName(row.name)
      }))
      .filter((npc) => {
        if (filters.zone && !includesFolded(npc.zone, filters.zone)) return false;
        if (filters.race && !includesFolded(npc.race, filters.race)) return false;
        if (typeof filters.named === "boolean" && npc.named !== filters.named) return false;
        const min = numberFromLevelRange(npc.level);
        if (filters.minLevel && min < filters.minLevel) return false;
        if (filters.maxLevel && min > filters.maxLevel) return false;
        return true;
      });
  }, () => summarizeNpcs().filter((npc) => {
    if (!includesFolded(npc.name, filters.q)) return false;
    if (filters.zone && !includesFolded(npc.zone, filters.zone)) return false;
    if (filters.race && !includesFolded(npc.race, filters.race)) return false;
    if (typeof filters.named === "boolean" && npc.named !== filters.named) return false;

    const min = numberFromLevelRange(npc.level);
    if (filters.minLevel && min < filters.minLevel) return false;
    if (filters.maxLevel && min > filters.maxLevel) return false;

    return true;
  }));
}

export async function getNpcDetail(id: number): Promise<NpcDetail | undefined> {
  return withDatabaseFallback(async () => {
    const result = await sql<{ id: number; name: string; race: number; level: number; class: number; hp: number; mindmg: number; maxdmg: number; npc_faction_id: number | null; zone_name: string | null }>`
      select nt.id, nt.name, nt.race, nt.level, nt.class, nt.hp, nt.mindmg, nt.maxdmg, nt.npc_faction_id, min(z.long_name) as zone_name
      from npc_types nt
      left join spawnentry se on se.npcID = nt.id
      left join spawngroup sg on sg.id = se.spawngroupID
      left join spawn2 s2 on s2.spawngroupID = sg.id
      left join zone z on z.short_name = s2.zone and z.version = s2.version
      where nt.id = ${id}
      group by nt.id, nt.name, nt.race, nt.level, nt.class, nt.hp, nt.mindmg, nt.maxdmg, nt.npc_faction_id
    `.execute(db!);

    const row = result.rows[0];

    if (!row) return undefined;

    const detail: NpcDetail = {
      id: row.id,
      name: formatNpcName(row.name),
      race: formatRace(row.race),
      level: String(row.level),
      zone: row.zone_name ?? "Unknown",
      named: isNamedNpcName(row.name),
      klass: formatNpcClass(row.class),
      hp: Number(row.hp ?? 0),
      damage: `${row.mindmg ?? 0} - ${row.maxdmg ?? 0}`,
      faction: row.npc_faction_id ? `Faction ${row.npc_faction_id}` : "Unknown",
      spells: [],
      drops: [],
      sells: [],
      spawnGroups: []
    };
    return detail;
  }, () => npcs.find((npc) => npc.id === id));
}

export async function listZones(filters: ZoneFilters = {}) {
  return withDatabaseFallback(async () => {
    const rows = await sql<{ short_name: string; long_name: string; zoneidnumber: number; expansion: number; min_level: number; max_level: number; note: string | null; spawns: number }>`
      select z.short_name, z.long_name, z.zoneidnumber, z.expansion, z.min_level, z.max_level, z.note, count(s2.id) as spawns
      from zone z
      left join spawn2 s2 on s2.zone = z.short_name and s2.version = z.version
      where z.short_name like ${like(filters.q)} or z.long_name like ${like(filters.q)}
      group by z.short_name, z.long_name, z.zoneidnumber, z.expansion, z.min_level, z.max_level, z.note
      order by z.long_name asc
      limit 200
    `.execute(db!);

    return rows.rows
      .map((row) => ({
        id: row.zoneidnumber,
        shortName: row.short_name,
        longName: row.long_name,
        spawns: Number(row.spawns ?? 0),
        era: formatExpansion(row.expansion),
        levelRange: formatLevelRange(row.min_level, row.max_level),
        population: row.note?.trim() || "Live zone data"
      }))
      .filter((zone) => {
        if (filters.era && !includesFolded(zone.era, filters.era)) return false;
        return true;
      });
  }, () => summarizeZones().filter((zone) => {
    if (!includesFolded(zone.longName, filters.q) && !includesFolded(zone.shortName, filters.q)) return false;
    if (filters.era && !includesFolded(zone.era, filters.era)) return false;
    return true;
  }));
}

export async function listZoneEras() {
  return withDatabaseFallback(async () => {
    const rows = await sql<{ expansion: number }>`
      select distinct expansion from zone order by expansion asc
    `.execute(db!);
    return rows.rows.map((row) => formatExpansion(row.expansion));
  }, () => [...new Set(zones.map((zone) => zone.era))]);
}

export async function getZonesByEra(era: string) {
  const all = await listZones();
  return all.filter((zone) => zone.era.toLowerCase() === era.toLowerCase());
}

export async function getZonesByLevel() {
  const all = await listZones();
  return all.slice().sort((a, b) => a.levelRange.localeCompare(b.levelRange));
}

export async function getZoneDetail(shortName: string): Promise<ZoneDetail | undefined> {
  return withDatabaseFallback(async () => {
    const result = await sql<{ short_name: string; long_name: string; zoneidnumber: number; expansion: number; min_level: number; max_level: number; note: string | null; safe_x: number; safe_y: number; safe_z: number }>`
      select short_name, long_name, zoneidnumber, expansion, min_level, max_level, note, safe_x, safe_y, safe_z
      from zone
      where short_name = ${shortName}
      limit 1
    `.execute(db!);

    const zone = result.rows[0];

    if (!zone) return undefined;

    const npcsInZone = await sql<{ id: number; name: string }>`
      select distinct nt.id, nt.name
      from npc_types nt
      join spawnentry se on se.npcID = nt.id
      join spawngroup sg on sg.id = se.spawngroupID
      join spawn2 s2 on s2.spawngroupID = sg.id
      where s2.zone = ${shortName}
      order by nt.name asc
      limit 25
    `.execute(db!);

    const bestiary = npcsInZone.rows.map((row) => ({ id: row.id, name: row.name, href: `/npcs/${row.id}` }));

    const detail: ZoneDetail = {
      id: zone.zoneidnumber,
      shortName: zone.short_name,
      longName: zone.long_name,
      spawns: bestiary.length,
      era: formatExpansion(zone.expansion),
      levelRange: formatLevelRange(zone.min_level, zone.max_level),
      population: zone.note?.trim() || "Live zone data",
      safePoint: `${zone.safe_x}, ${zone.safe_y}, ${zone.safe_z}`,
      resources: [
        { label: "Bestiary", href: `/zones/${shortName}?mode=npcs` },
        { label: "Named mobs", href: `/zones/${shortName}/named` }
      ],
      bestiary,
      namedNpcs: bestiary.filter((entry) => isNamedNpcName(entry.name)),
      itemDrops: [],
      forage: [],
      tasks: [],
      spawnGroups: []
    };
    return detail;
  }, () => zones.find((zone) => zone.shortName === shortName));
}

export async function listFactions(q?: string) {
  return withDatabaseFallback(async () => {
    const rows = await sql<{ id: number; name: string }>`
      select id, name
      from faction_list
      where name like ${like(q)}
      order by name asc
      limit 500
    `.execute(db!);

    return rows.rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: "Faction",
      alignedZone: "—"
    }));
  }, () => summarizeFactions().filter((faction) => includesFolded(faction.name, q)));
}

export function getFactionDetail(id: number): FactionDetail | undefined {
  return factions.find((faction) => faction.id === id);
}

export async function listRecipes(filters: RecipeFilters = {}) {
  return withDatabaseFallback(async () => {
    const clauses = [sql`1 = 1`];

    if (filters.q) {
      clauses.push(sql`name like ${like(filters.q)}`);
    }

    const tradeskillId = filters.tradeskill
      ? Object.entries(tradeskillNames).find(([, name]) => includesFolded(name, filters.tradeskill))?.[0]
      : undefined;
    if (tradeskillId) {
      clauses.push(sql`tradeskill = ${Number(tradeskillId)}`);
    }

    if (filters.minTrivial) {
      clauses.push(sql`trivial >= ${filters.minTrivial}`);
    }

    if (filters.maxTrivial) {
      clauses.push(sql`trivial <= ${filters.maxTrivial}`);
    }

    const rows = await sql<{ id: number; name: string; tradeskill: number; trivial: number }>`
      select id, name, tradeskill, trivial
      from tradeskill_recipe
      where ${sql.join(clauses, sql` and `)}
      order by name asc
      limit 100
    `.execute(db!);

    return rows.rows.map((row) => ({
      id: row.id,
      name: row.name,
      tradeskill: formatTradeskill(row.tradeskill),
      trivial: Number(row.trivial ?? 0),
      result: "—"
    }));
  }, () =>
    summarizeRecipes().filter((recipe) => {
      if (!includesFolded(recipe.name, filters.q)) return false;
      if (filters.tradeskill && !includesFolded(recipe.tradeskill, filters.tradeskill)) return false;
      if (filters.minTrivial && recipe.trivial < filters.minTrivial) return false;
      if (filters.maxTrivial && recipe.trivial > filters.maxTrivial) return false;
      return true;
    })
  );
}

export function getRecipeDetail(id: number): RecipeDetail | undefined {
  return recipes.find((recipe) => recipe.id === id);
}

export async function listPets(filters: PetFilters = {}): Promise<PetSummary[]> {
  return withDatabaseFallback(async () => {
    const classId = classIdFromName(filters.className);
    if (!classId) {
      return [];
    }

    const classColumn = sql.raw(`classes${classId}`);
    const rows = await sql<{
      spell_id: number;
      spell_name: string;
      new_icon: number;
      spell_level: number;
      race: number;
      pet_level: number;
      pet_class: number;
      hp: number;
      mana: number;
      ac: number;
      mindmg: number;
      maxdmg: number;
    }>`
      select
        s.id as spell_id,
        s.name as spell_name,
        s.new_icon,
        ${classColumn} as spell_level,
        nt.race,
        nt.level as pet_level,
        nt.class as pet_class,
        nt.hp,
        nt.mana,
        nt.ac,
        nt.mindmg,
        nt.maxdmg
      from spells_new s
      inner join pets p on p.type = s.teleport_zone
      inner join npc_types nt on nt.name = s.teleport_zone
      where ${classColumn} > 0 and ${classColumn} < 255
      group by s.id, s.name, s.new_icon, spell_level, nt.race, nt.level, nt.class, nt.hp, nt.mana, nt.ac, nt.mindmg, nt.maxdmg
      order by spell_level asc, s.name asc
    `.execute(db!);

    return rows.rows.map((row) => ({
      id: row.spell_id,
      spellId: row.spell_id,
      spellName: row.spell_name,
      spellIcon: String(row.new_icon ?? 0),
      ownerClass: classNames[classId - 1],
      ownerClassId: classId,
      spellLevel: Number(row.spell_level ?? 0),
      race: formatRace(row.race),
      petLevel: Number(row.pet_level ?? 0),
      petClass: formatNpcClass(row.pet_class),
      hp: Number(row.hp ?? 0),
      mana: Number(row.mana ?? 0),
      ac: Number(row.ac ?? 0),
      minDamage: Number(row.mindmg ?? 0),
      maxDamage: Number(row.maxdmg ?? 0)
    }));
  }, () =>
    pets
      .filter((pet) => !filters.className || includesFolded(pet.ownerClass, filters.className))
      .map((pet) => ({
        id: pet.id,
        spellId: pet.grantedBy.id,
        spellName: pet.grantedBy.name,
        spellIcon: pet.spellIcon ?? "0",
        ownerClass: pet.ownerClass,
        ownerClassId: pet.ownerClassId ?? classIdFromName(pet.ownerClass),
        spellLevel: pet.spellLevel ?? numberFromLevelRange(pet.levelRange),
        race: pet.race ?? "Unknown",
        petLevel: pet.petLevel ?? numberFromLevelRange(pet.levelRange),
        petClass: pet.petClass ?? "Unknown",
        hp: pet.hp ?? 0,
        mana: pet.mana ?? 0,
        ac: pet.ac ?? 0,
        minDamage: pet.minDamage ?? 0,
        maxDamage: pet.maxDamage ?? 0
      }))
  );
}

export async function getPetDetail(id: number): Promise<PetDetail | undefined> {
  return withDatabaseFallback(async () => {
    const result = await sql<Record<string, unknown>>`
      select
        s.id as spell_id,
        s.name as spell_name,
        s.new_icon,
        s.teleport_zone,
        s.classes1, s.classes2, s.classes3, s.classes4, s.classes5, s.classes6, s.classes7, s.classes8,
        s.classes9, s.classes10, s.classes11, s.classes12, s.classes13, s.classes14, s.classes15, s.classes16,
        nt.race,
        nt.level as pet_level,
        nt.class as pet_class,
        nt.hp,
        nt.mana,
        nt.ac,
        nt.mindmg,
        nt.maxdmg
      from spells_new s
      inner join pets p on p.type = s.teleport_zone
      inner join npc_types nt on nt.name = s.teleport_zone
      where s.id = ${id}
      limit 1
    `.execute(db!);

    const row = result.rows[0];
    if (!row) {
      return undefined;
    }

    const ownerClass: string = spellClassesFromRow(row)[0]?.klass ?? "Unknown";

    const detail: PetDetail = {
      id: Number(row.spell_id),
      name: formatNpcName(String(row.teleport_zone ?? "")),
      ownerClass,
      levelRange: String(row.pet_level ?? ""),
      grantedBy: { id: Number(row.spell_id), name: String(row.spell_name ?? ""), href: `/spells/${row.spell_id}` },
      notes: `${formatNpcClass(Number(row.pet_class ?? 0))} pet summoned by ${String(row.spell_name ?? "")}.`,
      spellIcon: String(row.new_icon ?? 0),
      race: formatRace(Number(row.race ?? 0)),
      petLevel: Number(row.pet_level ?? 0),
      petClass: formatNpcClass(Number(row.pet_class ?? 0)),
      hp: Number(row.hp ?? 0),
      mana: Number(row.mana ?? 0),
      ac: Number(row.ac ?? 0),
      minDamage: Number(row.mindmg ?? 0),
      maxDamage: Number(row.maxdmg ?? 0)
    };
    return detail;
  }, () => pets.find((pet) => pet.id === id));
}

export function listTasks(q?: string) {
  return tasks.filter((task) => includesFolded(task.title, q));
}

export function getTaskDetail(id: number): TaskDetail | undefined {
  return tasks.find((task) => task.id === id);
}

export function getSpawnGroupDetail(id: number): SpawnGroupDetail | undefined {
  return spawnGroups.find((group) => group.id === id);
}
