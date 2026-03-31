import { cacheGet, cacheGetOrResolve } from "./cache";
import { getDb } from "./db";
import { canonicalizeItemTypeName, itemTypeIdFromName, itemTypeNameFromId } from "./item-types";
import { factions, items, npcs, pets, recipes, spells, spawnGroups, tasks, zones } from "./mock-data";
import { formatPlayableItemRaceMask, raceNames } from "./race-names";
import { getSpellEffectName, resolveSpellEffectDirection, summarizeSpellEffects } from "./spell-effects";
import { formatExpansion, formatZoneEra, getZoneEraLabels, matchesZoneEraFilter } from "./zone-eras";
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
  ZoneByLevelSummary,
  ZoneDetail,
  ZoneLevelBand,
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
type PetFilters = { className?: string; classNames?: string[] };

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

const db = getDb();
const sourceMode = db ? "live" : "database-unavailable";
const databaseEnabled = Boolean(db);
const itemSearchLimit = 100;
const itemSearchCacheTtlSeconds = 60;
const zoneLevelBandSize = 5;
const zoneLevelBandMaximum = 110;
const zoneLevelBandSignificanceFloor = 5;
const publicZoneStatusCeiling = 1;
const merchantNpcClasses = [40, 41, 59, 61, 67, 68, 70] as const;
export const spellSearchLevelCap = 60;

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
  24: "Divination",
  98: "Combat Ability"
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
  2: "Area of effect over the caster",
  3: "Group teleport",
  4: "Area of effect around the caster",
  5: "Single target",
  6: "Self only",
  8: "Area of effect around the target",
  9: "Animal",
  10: "Undead only",
  11: "Summoned beings",
  13: "Life Tap",
  14: "Caster's pet",
  15: "Target's corpse",
  16: "Plant",
  17: "Giant",
  18: "Dragon",
  20: "Targeted area of effect life tap",
  24: "Area of effect on undeads",
  32: "Area of effect around the caster",
  33: "NPC hate list",
  34: "Dungeon object",
  35: "Muramite",
  36: "Area - PC only",
  37: "Area - NPC only",
  38: "Summoned pet",
  39: "Group without pets",
  40: "Friendly area of effect",
  41: "Group",
  42: "Self only (directional)",
  43: "Group with pets",
  44: "Beam"
};

const spellTypeNames: Record<number, string> = {
  1: "Nuke",
  2: "Heal",
  4: "Root",
  8: "Buff",
  16: "Escape",
  32: "Pet",
  64: "Lifetap",
  128: "Snare",
  256: "Dot"
};

const recipeTradeskillNames: Record<number, string> = {
  55: "Fishing",
  56: "Poison",
  57: "Tinkering",
  58: "Research",
  59: "Alchemy",
  60: "Baking",
  61: "Tailoring",
  63: "Blacksmithing",
  64: "Fletching",
  65: "Brewing",
  68: "Jewelry",
  69: "Pottery",
  75: "Poison"
};

const staticTradeskillContainers: Record<number, { name: string; icon: string }> = {
  15: { name: "Mixing Bowl", icon: "" },
  17: { name: "Forge", icon: "" }
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

// In the EQEmu item schema used here, `nodrop = 0` means the item is no-drop
// and `nodrop = 1` means it can be traded.
function isTradeableItem(nodrop: number | null | undefined) {
  return Number(nodrop ?? 0) !== 0;
}

function effectiveItemLevel(levelRequired: number | null | undefined) {
  return Math.max(1, Number(levelRequired ?? 0));
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

  switch (type.trim().toLowerCase()) {
    case "weapon":
      return sql`itemclass = 0 and damage > 0`;
    case "container": {
      const typeId = itemTypeIdFromName("Container");
      return typeId !== undefined ? sql`itemclass = 1 or itemtype = ${typeId}` : sql`itemclass = 1`;
    }
    case "book": {
      const bookId = itemTypeIdFromName("Book");
      const spellBookId = itemTypeIdFromName("Book with Spell Effect");
      if (bookId !== undefined && spellBookId !== undefined) {
        return sql`itemclass = 2 or itemtype in (${bookId}, ${spellBookId})`;
      }
      return sql`itemclass = 2`;
    }
    default:
      break;
  }

  const typeId = itemTypeIdFromName(type);
  return typeId !== undefined ? sql`itemclass = 0 and itemtype = ${typeId}` : null;
}

function itemTypeMatchesFilter(itemType: string, filterType?: string) {
  if (!filterType) return true;

  if (filterType.trim().toLowerCase() === "weapon") {
    return ["1H Slashing", "2H Slashing", "Piercing", "1H Blunt", "2H Blunt", "Archery", "Crossbow", "Throwing v1", "Throwing v2", "2H Piercing", "Hand to Hand"].includes(itemType);
  }

  const canonical = canonicalizeItemTypeName(filterType);
  return canonical ? itemType === canonical : includesFolded(itemType, filterType);
}

function itemMatchesFilters(item: ItemSummary, filters: ItemFilters) {
  if (!includesFolded(item.name, filters.q)) return false;
  if (filters.className && !item.classes.some((klass) => includesFolded(klass, filters.className))) return false;
  if (filters.slot && !includesFolded(item.slot, filters.slot)) return false;
  if (!itemTypeMatchesFilter(item.type, filters.type)) return false;
  if (typeof filters.tradeable === "boolean" && item.tradeable !== filters.tradeable) return false;
  const itemLevel = effectiveItemLevel(item.levelRequired);
  if (filters.minLevel && itemLevel < filters.minLevel) return false;
  if (filters.maxLevel && itemLevel > filters.maxLevel) return false;
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
  return formatPlayableItemRaceMask(mask);
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
  if ((damage ?? 0) > 0 && (itemType ?? -1) < 0) return "Weapon";
  return itemTypeNameFromId(itemType);
}

function formatDetailedItemType(itemType: number | null | undefined) {
  return itemTypeNameFromId(itemType);
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
  return recipeTradeskillNames[tradeskill ?? -1] ?? `Tradeskill ${tradeskill ?? 0}`;
}

function resolveRecipeTradeskillIds(tradeskill?: string) {
  if (!tradeskill) return [];

  return Object.entries(recipeTradeskillNames)
    .filter(([, name]) => includesFolded(name, tradeskill))
    .map(([id]) => Number(id));
}

function classIdFromName(className?: string) {
  if (!className) return 0;
  const index = classNames.findIndex((entry) => entry.toLowerCase() === className.toLowerCase());
  return index >= 0 ? index + 1 : 0;
}

function formatLevelRange(minLevel: number | null | undefined, maxLevel: number | null | undefined) {
  const min = Number(minLevel ?? 0);
  const max = Number(maxLevel ?? 0);
  const hasMin = min > 0;
  const hasFiniteMax = max > 0 && max < 255;

  if (hasMin && hasFiniteMax && min !== max) return `${min} - ${max}`;
  if (hasMin && hasFiniteMax) return String(min);
  if (hasMin) return `${min}+`;
  if (hasFiniteMax) return `Up to ${max}`;
  return "All levels";
}

function isNamedNpcName(name: string) {
  const lower = name.trim().toLowerCase();
  return !(lower.startsWith("a ") || lower.startsWith("an ") || lower.startsWith("the "));
}

function formatNpcClassification(name: string) {
  if (name.startsWith("###")) return "Boss";
  if (name.startsWith("##")) return "Mini-Boss";
  if (name.startsWith("#")) return "Named";
  if (name.startsWith("~")) return "Quest NPC";
  if (name.startsWith("!")) return "Hidden";
  if (name.startsWith("_")) return "Event Spawned";
  return "Normal";
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

function discoveredItemClause(columnRef: string) {
  return sql`exists (
    select 1
    from discovered_items di
    where di.item_id = ${sql.ref(columnRef)}
  )`;
}

async function withDatabaseFallback<T>(run: () => Promise<T>, _fallback: () => T | Promise<T>) {
  if (!databaseEnabled || !db) {
    throw new Error("Database connection is required. Mock data fallback has been disabled.");
  }

  return run();
}

function includesFolded(value: string, query?: string) {
  if (!query) return true;
  return value.toLowerCase().includes(query.toLowerCase());
}

function numberFromLevelRange(level: string) {
  const digits = level.match(/\d+/g);
  return digits ? Number(digits[0]) : 0;
}

function buildZoneLevelBandDefinitions(maximumLevel = zoneLevelBandMaximum) {
  const totalBands = Math.ceil(maximumLevel / zoneLevelBandSize);
  return Array.from({ length: totalBands }, (_, index) => {
    const minLevel = index * zoneLevelBandSize + 1;
    const maxLevel = Math.min((index + 1) * zoneLevelBandSize, maximumLevel);
    return {
      index,
      minLevel,
      maxLevel,
      label: `${minLevel} - ${maxLevel}`
    };
  });
}

function roundToZoneLevelBand(level: number, maximumLevel = zoneLevelBandMaximum) {
  const safeLevel = Math.max(1, Math.min(maximumLevel, Math.round(level)));
  const bandIndex = Math.floor((safeLevel - 1) / zoneLevelBandSize);
  const minLevel = bandIndex * zoneLevelBandSize + 1;
  const maxLevel = Math.min((bandIndex + 1) * zoneLevelBandSize, maximumLevel);
  return `${minLevel} - ${maxLevel}`;
}

function createZoneLevelBands(
  bucketCounts: Map<number, number>,
  maximumLevel = zoneLevelBandMaximum
): ZoneLevelBand[] {
  return buildZoneLevelBandDefinitions(maximumLevel).map((band) => {
    const npcCount = bucketCounts.get(band.index) ?? 0;
    return {
      label: band.label,
      minLevel: band.minLevel,
      maxLevel: band.maxLevel,
      npcCount,
      isSignificant: npcCount >= zoneLevelBandSignificanceFloor
    };
  });
}

function calculateSuggestedZoneLevel(bands: ZoneLevelBand[]) {
  const significantBands = bands.filter((band) => band.isSignificant);

  if (significantBands.length === 0) {
    const fallbackBand = bands.find((band) => band.npcCount > 0);
    return fallbackBand ? fallbackBand.label : "Unknown";
  }

  const totalWeight = significantBands.reduce((sum, band) => sum + band.npcCount, 0);
  const weightedMidpoint = significantBands.reduce(
    (sum, band) => sum + ((band.minLevel + band.maxLevel) / 2) * band.npcCount,
    0
  );

  return roundToZoneLevelBand(weightedMidpoint / Math.max(totalWeight, 1));
}

function sortValueForZoneLevelBands(bands: ZoneLevelBand[]) {
  const significantBands = bands.filter((band) => band.isSignificant);
  const sortableBands = significantBands.length > 0 ? significantBands : bands.filter((band) => band.npcCount > 0);

  if (sortableBands.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const totalWeight = sortableBands.reduce((sum, band) => sum + band.npcCount, 0);
  return sortableBands.reduce((sum, band) => sum + band.maxLevel * band.npcCount, 0) / Math.max(totalWeight, 1);
}

function formatSeconds(seconds: number) {
  if (seconds <= 0) {
    return "Instant";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds - hours * 3600) / 60);
  const remainingSeconds = seconds - hours * 3600 - minutes * 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(hours === 1 ? "1 hour" : `${hours} hours`);
  if (minutes > 0) parts.push(`${minutes} min`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds} sec`);

  return parts.join(" ");
}

function formatMilliseconds(value: number | null | undefined) {
  const seconds = Number(value ?? 0) / 1000;
  if (seconds <= 0) {
    return "0 sec";
  }

  return Number.isInteger(seconds) ? `${seconds} sec` : `${seconds.toFixed(1)} sec`;
}

function calculateBuffDuration(level: number, formula: number, duration: number) {
  switch (formula) {
    case 0:
      return 0;
    case 1:
    case 6: {
      const value = Math.ceil(level / 2);
      return Math.min(Math.max(value, 1), duration);
    }
    case 2: {
      const value = Math.ceil((duration / 5) * 3);
      return Math.min(Math.max(value, 1), duration);
    }
    case 3: {
      const value = level * 30;
      return Math.min(Math.max(value, 1), duration);
    }
    case 4:
    case 11:
    case 12:
      return duration;
    case 5:
      return Math.min(Math.max(duration, 1), 3);
    case 7: {
      const value = level;
      return Math.min(Math.max(value, 1), duration);
    }
    case 8: {
      const value = level + 10;
      return Math.min(Math.max(value, 1), duration);
    }
    case 9: {
      const value = level * 2 + 10;
      return Math.min(Math.max(value, 1), duration);
    }
    case 10: {
      const value = level * 3 + 10;
      return Math.min(Math.max(value, 1), duration);
    }
    case 50:
      return 72000;
    case 3600:
      return duration || 3600;
    default:
      return duration;
  }
}

function formatSpellDuration(row: Record<string, unknown>, minimumLevel: number) {
  const duration = calculateBuffDuration(
    minimumLevel,
    Number(row.buffdurationformula ?? 0),
    Number(row.buffduration ?? 0)
  );

  if (duration === 0) {
    return "Instant";
  }

  return `${formatSeconds(duration * 6)} (${duration} ticks)`;
}

function formatNumericEffectLabel(label: string, value: number) {
  if (value === 0) {
    return label;
  }

  const nextLabel = resolveSpellEffectDirection(label, value);

  return `${nextLabel} by ${Math.abs(value)}`;
}

function effectSpellIdFromValues(effectId: number, base: number, limit: number) {
  switch (effectId) {
    case 85:
    case 139:
    case 289:
    case 323:
    case 333:
    case 373:
    case 377:
    case 386:
    case 387:
      return Math.abs(base);
    case 339:
    case 340:
    case 360:
    case 361:
    case 365:
    case 374:
    case 383:
      return Math.abs(limit);
    default:
      return 0;
  }
}

function formatReferencedSpell(spellId: number, spellNames: Map<number, string>) {
  if (spellId <= 0) {
    return "";
  }

  return spellNames.get(spellId) ?? `Spell ${spellId}`;
}

function describeSpellEffectSlot(row: Record<string, unknown>, slot: number, spellNames: Map<number, string> = new Map()) {
  const effectId = Number(row[`effectid${slot}`] ?? 254);
  if (!Number.isFinite(effectId) || effectId === 10 || effectId === 254) {
    return undefined;
  }

  const label = getSpellEffectName(effectId);
  const base = Number(row[`effect_base_value${slot}`] ?? 0);
  const limit = Number(row[`effect_limit_value${slot}`] ?? 0);
  const max = Number(row[`max${slot}`] ?? 0);
  const teleportZone = normalizeText(String(row.teleport_zone ?? "")) ?? "";
  const spellId = effectSpellIdFromValues(effectId, base, limit);
  const referencedSpell = formatReferencedSpell(spellId, spellNames);

  switch (effectId) {
    case 21:
      return `${label} (${Math.abs(base) / 1000} sec)`;
    case 22:
    case 23:
    case 31:
      return max > 0 ? `${label} up to level ${max}` : label;
    case 33:
    case 71:
    case 106:
    case 108:
    case 113:
    case 152:
      return teleportZone ? `${label} ${teleportZone}` : label;
    case 81:
      return base !== 0 ? `${label} and restore ${Math.abs(base)}% experience` : label;
    case 83:
    case 88:
    case 145:
      return teleportZone ? `${label} ${teleportZone}` : label;
    case 85:
    case 289:
    case 323:
      return spellId > 0
        ? `${label} ${referencedSpell}${limit !== 0 ? ` (rate modifier ${Math.abs(limit)})` : ""}`
        : label;
    case 333:
      return spellId > 0 ? `${label} ${referencedSpell}` : label;
    case 339:
    case 340:
    case 360:
    case 361:
    case 365:
    case 374:
      return spellId > 0
        ? `${label} (${Math.abs(base)}% chance to cast ${referencedSpell}${max > 0 ? `, min target level ${Math.abs(max)}` : ""})`
        : label;
    case 373:
    case 377:
    case 386:
    case 387:
      return spellId > 0 ? `${label} ${referencedSpell}` : label;
    case 383:
      return spellId > 0
        ? `${label} ${referencedSpell}${base !== 0 ? ` (proc rate modifier ${Math.abs(base)})` : ""}`
        : label;
    case 91:
      return Math.abs(base || max) > 0 ? `${label} (max level ${Math.abs(base || max)})` : label;
    case 136: {
      const targetId = Math.abs(base || limit || max);
      return targetId > 0 ? `${label} (${formatTarget(targetId)})` : label;
    }
    case 142:
      return Math.abs(base) > 0 ? `Limit: Min Level ${Math.abs(base)}` : "Limit: Min Level";
    case 139:
      return spellId > 0 ? `${label} ${referencedSpell}` : label;
    case 140:
      return Math.abs(base) > 0 ? `${label} (${Math.abs(base) * 6} sec)` : label;
    default:
      if (base !== 0) {
        return formatNumericEffectLabel(label, base);
      }
      if (limit !== 0) {
        return `${label} (${limit})`;
      }
      if (max !== 0) {
        return `${label} (${max})`;
      }
      return label;
  }
}

function describeSpellEffects(row: Record<string, unknown>, spellNames: Map<number, string> = new Map()) {
  const effects: Array<{ slot: number; text: string }> = [];

  for (let slot = 1; slot <= 12; slot += 1) {
    const text = describeSpellEffectSlot(row, slot, spellNames);
    if (text) {
      effects.push({ slot, text });
    }
  }

  return effects;
}

function formatNpcSpellType(type: number | null | undefined) {
  return spellTypeNames[type ?? -1] ?? `Type ${type ?? 0}`;
}

function formatCoinString(price: number | null | undefined) {
  const parts = formatCoinValue(price);
  const formatted = [
    parts.pp > 0 ? `${parts.pp}p` : "",
    parts.gp > 0 ? `${parts.gp}g` : "",
    parts.sp > 0 ? `${parts.sp}s` : "",
    parts.cp > 0 ? `${parts.cp}c` : ""
  ].filter(Boolean);

  return formatted.join(" ") || "0c";
}

function decodeNpcSpecialAttacks(raw: string | null | undefined) {
  const names: Record<string, string> = {
    A: "Immune to melee",
    B: "Immune to magic",
    C: "Uncharmable",
    D: "Unfearable",
    E: "Enrage",
    F: "Flurry",
    f: "Immune to fleeing",
    I: "Unsnarable",
    M: "Unmezzable",
    N: "Unstunable",
    O: "Immune to melee except bane",
    Q: "Quadruple Attack",
    R: "Rampage",
    S: "Summon",
    T: "Triple Attack",
    U: "Unslowable",
    W: "Immune to melee except magical"
  };

  return [...new Set(String(raw ?? "").split("").map((flag) => names[flag]).filter(Boolean))];
}

function buildSpellDetailFallback(id: number): SpellDetail | undefined {
  const spell = spells.find((entry) => entry.id === id);
  if (!spell) return undefined;

  return {
    ...spell,
    description: `${spell.skill} spell`,
    classLevels: spell.classes.map((className, index) => ({ className, level: index === 0 ? spell.level : spell.level })),
    messages: [],
    castTime: "0 sec",
    recoveryTime: "0 sec",
    recastTime: "0 sec",
    range: "Unknown",
    duration: "Instant",
    resist: "Unknown",
    resistAdjust: 0,
    interruptible: true,
    hateGenerated: 0,
    aoeRange: 0,
    aoeMaxTargets: 0,
    aoeDuration: "Instant",
    reagents: [],
    effects: spell.effect ? [{ slot: 1, text: spell.effect }] : [],
    itemSources: []
  };
}

function buildNpcDetailFallback(id: number): NpcDetail | undefined {
  const npc = npcs.find((entry) => entry.id === id);
  if (!npc) return undefined;

  return {
    ...npc,
    fullName: npc.name,
    appearance: npc.appearance,
    hp: 0,
    mana: 0,
    damage: "0 to 0",
    faction: "Unknown",
    mainFaction: null,
    attackDelay: 0,
    specialAttacks: [],
    spells: [],
    drops: [],
    sells: [],
    spawnGroups: [],
    spawnZones: npc.zone && npc.zone !== "Unknown" ? [{ shortName: npc.zone, longName: npc.zone, href: "#" }] : [],
    factionHits: {
      lowers: [],
      raises: []
    }
  };
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
    tradeable: isTradeableItem(row.nodrop),
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
  const effectiveRequiredLevelClause = sql`greatest(coalesce(reqlevel, 0), 1)`;

  if (typeof filters.tradeable === "boolean") {
    clauses.push(filters.tradeable ? sql`coalesce(nodrop, 0) <> 0` : sql`coalesce(nodrop, 0) = 0`);
  }

  if (filters.minLevel) {
    clauses.push(sql`${effectiveRequiredLevelClause} >= ${filters.minLevel}`);
  }

  if (filters.maxLevel) {
    clauses.push(sql`${effectiveRequiredLevelClause} <= ${filters.maxLevel}`);
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
    select i.id
    from items i
    where ${discoveredItemClause("i.id")}
      and ${sql.join(clauses, sql` and `)}
    order by ${filters.q ? sql`Name asc` : sql`i.id asc`}
    limit ${limit}
  `.execute(db);

  return result.rows.map((row) => row.id);
}

async function fetchItemsByIds(ids: number[]) {
  if (!db || ids.length === 0) {
    return [];
  }

  const rows = await sql<ItemSearchRow>`
    select i.id, i.Name as name, i.itemclass, i.itemtype, i.slots, i.classes, i.nodrop, i.reqlevel, i.damage, i.delay, i.source, i.ac, i.hp, i.mana, i.icon
    from items i
    where ${discoveredItemClause("i.id")}
      and i.id in (${sql.join(ids)})
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
    className: classes[0] ?? "Unknown",
    classLevel,
    level,
    skill,
    effect,
    mana,
    target
  }));
}

function sortSpellResults(results: SpellSummary[], filters: SpellFilters) {
  const sorted = [...results];

  sorted.sort((left, right) => {
    if (filters.className && left.level !== right.level) {
      return left.level - right.level;
    }

    return left.name.localeCompare(right.name);
  });

  return sorted;
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
  return factions.map(({ id, name, category, alignedZone, raisedBy, loweredBy }) => ({
    id,
    name,
    category,
    alignedZone,
    raisedByCount: raisedBy.length,
    loweredByCount: loweredBy.length
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
        (select count(*) from items i where ${discoveredItemClause("i.id")}) as items,
        (select count(*) from spells_new) as spells,
        (select count(*) from npc_types) as npcs,
        (select count(*) from zone z where coalesce(z.version, 0) = 0 and coalesce(z.min_status, 0) <= ${publicZoneStatusCeiling}) as zones,
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
      const spellSearchClassClauses = classNames.map((_, index) => {
        const classColumn = sql.raw(`classes${index + 1}`);
        return sql`(${classColumn} > 0 and ${classColumn} < 255 and ${classColumn} <= ${spellSearchLevelCap})`;
      });
      const [itemRows, spellRows, npcRows, zoneRows, factionRows, recipeRows] = await Promise.all([
        sql<{ id: number; name: string; icon: number; itemclass: number; itemtype: number; slots: number; damage: number }>`
          select id, Name as name, icon, itemclass, itemtype, slots, damage
          from items i
          where ${discoveredItemClause("i.id")}
            and Name like ${like(query)}
          order by Name asc
          limit 8
        `.execute(db!),
        sql<Record<string, unknown>>`
          select id, name, new_icon, skill, cast_on_you, classes1, classes2, classes3, classes4, classes5, classes6, classes7, classes8,
                 classes9, classes10, classes11, classes12, classes13, classes14, classes15, classes16
          from spells_new
          where name like ${like(query)}
            and (${sql.join(spellSearchClassClauses, sql` or `)})
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
            and coalesce(z.min_status, 0) <= ${publicZoneStatusCeiling}
          where nt.name like ${like(query)}
          group by nt.id, nt.name, nt.race, nt.level
          order by nt.name asc
          limit 8
        `.execute(db!),
        sql<{ short_name: string; long_name: string; expansion: number; min_level: number; max_level: number }>`
          select short_name, long_name, expansion, min_level, max_level
          from zone
          where coalesce(version, 0) = 0
            and coalesce(min_status, 0) <= ${publicZoneStatusCeiling}
            and (short_name like ${like(query)} or long_name like ${like(query)})
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
        const classes = spellClassesFromRow(row).filter((entry) => entry.level <= spellSearchLevelCap);
        if (classes.length === 0) continue;
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
          subtitle: `${formatZoneEra(row.short_name, row.expansion)} • ${formatLevelRange(row.min_level, row.max_level)}`,
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
        if ((includesFolded(spell.name, query) || includesFolded(spell.effect, query)) && spell.level <= spellSearchLevelCap) {
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
      from items i
      where i.id = ${id}
        and ${discoveredItemClause("i.id")}
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
        and coalesce(z.min_status, 0) <= ${publicZoneStatusCeiling}
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
      !isTradeableItem(row.nodrop) ? "No Drop" : null,
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
      tradeable: isTradeableItem(row.nodrop),
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
    const clauses = [];
    const classId = classIdFromName(filters.className);

    if (filters.q) {
      clauses.push(sql`
        (
          name like ${like(filters.q)}
          or cast_on_you like ${like(filters.q)}
          or cast_on_other like ${like(filters.q)}
          or you_cast like ${like(filters.q)}
          or spell_fades like ${like(filters.q)}
        )
      `);
    }

    if (classId > 0) {
      const classColumn = sql.raw(`classes${classId}`);
      clauses.push(sql`${classColumn} > 0 and ${classColumn} < 255 and ${classColumn} <= ${spellSearchLevelCap}`);

      if (filters.level) {
        if (filters.levelMode === "min") clauses.push(sql`${classColumn} >= ${filters.level}`);
        else if (filters.levelMode === "max") clauses.push(sql`${classColumn} <= ${filters.level}`);
        else clauses.push(sql`${classColumn} = ${filters.level}`);
      }
    } else if (filters.level) {
      const levelClauses = classNames.map((_, index) => {
        const classColumn = sql.raw(`classes${index + 1}`);
        if (filters.levelMode === "min") return sql`(${classColumn} >= ${filters.level} and ${classColumn} < 255 and ${classColumn} <= ${spellSearchLevelCap})`;
        if (filters.levelMode === "max") return sql`(${classColumn} > 0 and ${classColumn} <= ${filters.level} and ${classColumn} <= ${spellSearchLevelCap})`;
        return sql`(${classColumn} = ${filters.level} and ${classColumn} <= ${spellSearchLevelCap})`;
      });

      clauses.push(sql`(${sql.join(levelClauses, sql` or `)})`);
    } else {
      const publicLevelClauses = classNames.map((_, index) => {
        const classColumn = sql.raw(`classes${index + 1}`);
        return sql`(${classColumn} > 0 and ${classColumn} < 255 and ${classColumn} <= ${spellSearchLevelCap})`;
      });

      clauses.push(sql`(${sql.join(publicLevelClauses, sql` or `)})`);
    }

    const whereClause = clauses.length > 0 ? sql`where ${sql.join(clauses, sql` and `)}` : sql``;
    const orderByClause = classId > 0 ? sql`order by ${sql.raw(`classes${classId}`)} asc, name asc` : sql`order by name asc`;

    const rows = await sql<Record<string, unknown>>`
      select id, name, new_icon, skill, effectid1, effectid2, effectid3, effectid4, effectid5, effectid6, effectid7, effectid8, effectid9, effectid10, effectid11, effectid12,
             effect_base_value1, effect_base_value2, effect_base_value3, effect_base_value4, effect_base_value5, effect_base_value6,
             effect_base_value7, effect_base_value8, effect_base_value9, effect_base_value10, effect_base_value11, effect_base_value12,
             cast_on_you, cast_on_other, you_cast, spell_fades, mana, targettype, classes1, classes2, classes3, classes4, classes5, classes6, classes7, classes8,
             classes9, classes10, classes11, classes12, classes13, classes14, classes15, classes16
      from spells_new
      ${whereClause}
      ${orderByClause}
      limit 5000
    `.execute(db!);

    const results = rows.rows
      .map((row) => {
        const classes = spellClassesFromRow(row);
        const primaryClass =
          classes.find((entry) => (filters.className ? includesFolded(entry.klass, filters.className) : true)) ?? classes[0];
        return {
          id: Number(row.id),
          name: String(row.name),
          icon: String(row.new_icon ?? 0),
          classes: classes.map((entry) => entry.klass),
          className: primaryClass?.klass ?? "Unknown",
          classLevel: primaryClass ? `${primaryClass.klass} ${primaryClass.level}` : "Unknown",
          level: primaryClass?.level ?? Math.min(...classes.map((entry) => entry.level), 255),
          skill: formatSpellSkill(Number(row.skill ?? 0)),
          effect: summarizeSpellEffects(row),
          mana: Number(row.mana ?? 0),
          target: formatTarget(Number(row.targettype ?? 0))
        };
      })
      .filter((spell) => {
        if (spell.level > spellSearchLevelCap) return false;
        if (filters.className && !spell.classes.some((klass) => includesFolded(klass, filters.className))) return false;
        if (filters.level) {
          if (filters.levelMode === "min" && spell.level < filters.level) return false;
          else if (filters.levelMode === "max" && spell.level > filters.level) return false;
          else if ((!filters.levelMode || filters.levelMode === "exact") && spell.level !== filters.level) return false;
        }
        return true;
      });
    return sortSpellResults(results, filters);
  }, () => {
    const results = spells
      .filter((spell) => {
        if (spell.level > spellSearchLevelCap) return false;
        if (!includesFolded(spell.name, filters.q) && !includesFolded(spell.effect, filters.q) && !includesFolded(spell.description, filters.q)) {
          return false;
        }
        if (filters.className && !spell.classes.some((klass) => includesFolded(klass, filters.className))) return false;
        if (filters.level) {
          if (filters.levelMode === "min" && spell.level < filters.level) return false;
          else if (filters.levelMode === "max" && spell.level > filters.level) return false;
          else if ((!filters.levelMode || filters.levelMode === "exact") && spell.level !== filters.level) return false;
        }
        return true;
      })
      .map((spell) => ({
        id: spell.id,
        name: spell.name,
        icon: spell.icon,
        classes: spell.classes,
        className: filters.className && spell.classes.some((klass) => includesFolded(klass, filters.className)) ? filters.className : spell.classes[0] ?? "Unknown",
        classLevel: spell.classLevel,
        level: spell.level,
        skill: spell.skill,
        effect: spell.effect,
        mana: spell.mana,
        target: spell.target
      }));

    return sortSpellResults(results, filters);
  });
}

export async function getSpellDetail(id: number): Promise<SpellDetail | undefined> {
  return withDatabaseFallback(async () => {
    const result = await sql<Record<string, unknown>>`
      select id, name, new_icon, skill, teleport_zone, mana, targettype, resisttype, cast_on_you, cast_on_other, you_cast, other_casts, spell_fades,
             cast_time, recovery_time, recast_time, \`range\`, aoerange, aemaxtargets, AEDuration, buffdurationformula, buffduration,
             uninterruptable, ResistDiff, HateAdded, bonushate,
             components1, component_counts1, components2, component_counts2, components3, component_counts3, components4, component_counts4,
             effectid1, effectid2, effectid3, effectid4, effectid5, effectid6, effectid7, effectid8, effectid9, effectid10, effectid11, effectid12,
             effect_base_value1, effect_base_value2, effect_base_value3, effect_base_value4, effect_base_value5, effect_base_value6,
             effect_base_value7, effect_base_value8, effect_base_value9, effect_base_value10, effect_base_value11, effect_base_value12,
             effect_limit_value1, effect_limit_value2, effect_limit_value3, effect_limit_value4, effect_limit_value5, effect_limit_value6,
             effect_limit_value7, effect_limit_value8, effect_limit_value9, effect_limit_value10, effect_limit_value11, effect_limit_value12,
             max1, max2, max3, max4, max5, max6, max7, max8, max9, max10, max11, max12,
             formula1, formula2, formula3, formula4, formula5, formula6, formula7, formula8, formula9, formula10, formula11, formula12,
             classes1, classes2, classes3, classes4, classes5, classes6, classes7, classes8,
             classes9, classes10, classes11, classes12, classes13, classes14, classes15, classes16
      from spells_new
      where id = ${id}
    `.execute(db!);

    const row = result.rows[0];

    if (!row) return undefined;

    const classes = spellClassesFromRow(row);
    const minimumLevel = classes.length > 0 ? Math.min(...classes.map((entry) => entry.level)) : 70;
    const componentIds = Array.from(
      new Set(
        Array.from({ length: 4 }, (_, index) => Number(row[`components${index + 1}`] ?? 0)).filter((componentId) => componentId > 0)
      )
    );
    const referencedSpellIds = Array.from(
      new Set(
        Array.from({ length: 12 }, (_, index) => {
          const slot = index + 1;
          const effectId = Number(row[`effectid${slot}`] ?? 0);
          const base = Number(row[`effect_base_value${slot}`] ?? 0);
          const limit = Number(row[`effect_limit_value${slot}`] ?? 0);
          return effectSpellIdFromValues(effectId, base, limit);
        }).filter((spellId) => spellId > 0)
      )
    );
    const [componentResult, itemSourceResult] = await Promise.all([
      componentIds.length > 0
        ? sql<{ id: number; name: string }>`
            select i.id, i.Name as name
            from items i
            where ${discoveredItemClause("i.id")}
              and i.id in (${sql.join(componentIds)})
          `.execute(db!)
        : Promise.resolve({ rows: [] as Array<{ id: number; name: string }> }),
      sql<{ id: number; name: string; icon: number }>`
        select i.id, i.Name as name, i.icon
        from items i
        where ${discoveredItemClause("i.id")}
          and i.scrolleffect = ${id}
        order by i.Name asc
      `.execute(db!)
    ]);

    const componentNames = new Map(componentResult.rows.map((entry) => [entry.id, entry.name]));
    const referencedSpellNames = await spellNamesById(referencedSpellIds);
    const messages = [
      { label: "When you cast", text: normalizeText(String(row.you_cast ?? "")) },
      { label: "When others cast", text: normalizeText(String(row.other_casts ?? "")) },
      { label: "When cast on you", text: normalizeText(String(row.cast_on_you ?? "")) },
      { label: "When cast on other", text: normalizeText(String(row.cast_on_other ?? "")) },
      { label: "When fading", text: normalizeText(String(row.spell_fades ?? "")) }
    ].filter((entry): entry is { label: string; text: string } => Boolean(entry.text));

    return {
      id: Number(row.id),
      name: String(row.name),
      icon: String(row.new_icon ?? 0),
      classes: classes.map((entry) => entry.klass),
      className: classes[0]?.klass ?? "NPC",
      classLevel: classes[0] ? `${classes[0].klass} ${classes[0].level}` : "NPC only",
      level: classes.length > 0 ? Math.min(...classes.map((entry) => entry.level)) : 0,
      skill: formatSpellSkill(Number(row.skill ?? 0)),
      effect: summarizeSpellEffects(row),
      mana: Number(row.mana ?? 0),
      target: formatTarget(Number(row.targettype ?? 0)),
      description: messages[0]?.text ?? `${formatSpellSkill(Number(row.skill ?? 0))} spell`,
      classLevels: classes.map((entry) => ({ className: entry.klass, level: entry.level })),
      messages,
      castTime: formatMilliseconds(Number(row.cast_time ?? 0)),
      recoveryTime: formatMilliseconds(Number(row.recovery_time ?? 0)),
      recastTime: formatMilliseconds(Number(row.recast_time ?? 0)),
      range: Number(row.range ?? 0) > 0 ? String(row.range) : "0",
      duration: formatSpellDuration(row, minimumLevel),
      resist: formatResist(Number(row.resisttype ?? 255)),
      resistAdjust: Number(row.ResistDiff ?? 0),
      interruptible: Number(row.uninterruptable ?? 0) === 0,
      hateGenerated: Number(row.HateAdded ?? 0) + Number(row.bonushate ?? 0),
      aoeRange: Number(row.aoerange ?? 0),
      aoeMaxTargets: Number(row.aemaxtargets ?? 0),
      aoeDuration: Number(row.AEDuration ?? 0) >= 1000 ? formatMilliseconds(Number(row.AEDuration ?? 0)) : "Instant",
      reagents: Array.from({ length: 4 }, (_, index) => {
        const reagentId = Number(row[`components${index + 1}`] ?? 0);
        if (reagentId <= 0) {
          return undefined;
        }

        const reagentName = componentNames.get(reagentId);
        if (!reagentName) {
          return undefined;
        }

        return {
          id: reagentId,
          name: reagentName,
          count: Number(row[`component_counts${index + 1}`] ?? 1),
          href: `/items/${reagentId}`
        };
      }).filter((entry): entry is { id: number; name: string; count: number; href: string } => Boolean(entry)),
      effects: describeSpellEffects(row, referencedSpellNames),
      itemSources: itemSourceResult.rows.map((entry) => ({
        id: entry.id,
        name: entry.name,
        href: `/items/${entry.id}`,
        icon: String(entry.icon ?? 0)
      }))
    };
  }, () => buildSpellDetailFallback(id));
}

export async function listNpcs(filters: NpcFilters = {}) {
  return withDatabaseFallback(async () => {
    const rows = await sql<{ id: number; name: string; race: number; level: number; class: number; zone_name: string | null }>`
      select nt.id, nt.name, nt.race, nt.level, nt.class, min(z.long_name) as zone_name
      from npc_types nt
      left join spawnentry se on se.npcID = nt.id
      left join spawngroup sg on sg.id = se.spawngroupID
      left join spawn2 s2 on s2.spawngroupID = sg.id
      left join (
        select short_name, min(long_name) as long_name
        from zone
        where coalesce(version, 0) = 0
          and coalesce(min_status, 0) <= ${publicZoneStatusCeiling}
        group by short_name
      ) z on z.short_name = s2.zone
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
    const result = await sql<{
      id: number;
      name: string;
      lastname: string | null;
      race: number;
      gender: number | null;
      texture: number | null;
      helmtexture: number | null;
      level: number;
      class: number;
      hp: number;
      mana: number;
      mindmg: number;
      maxdmg: number;
      npc_faction_id: number | null;
      npc_spells_id: number | null;
      loottable_id: number | null;
      merchant_id: number | null;
      npcspecialattks: string | null;
      attack_delay: number | null;
      zone_name: string | null;
      primary_faction_id: number | null;
      primary_faction_name: string | null;
    }>`
      select nt.id, nt.name, nt.lastname, nt.race, nt.gender, nt.texture, nt.helmtexture, nt.level, nt.class, nt.hp, nt.mana, nt.mindmg, nt.maxdmg,
             nt.npc_faction_id, nt.npc_spells_id, nt.loottable_id, nt.merchant_id, nt.npcspecialattks, nt.attack_delay,
             min(z.long_name) as zone_name, fl.id as primary_faction_id, fl.name as primary_faction_name
      from npc_types nt
      left join npc_faction nf on nf.id = nt.npc_faction_id
      left join faction_list fl on fl.id = nf.primaryfaction
      left join spawnentry se on se.npcID = nt.id
      left join spawngroup sg on sg.id = se.spawngroupID
      left join spawn2 s2 on s2.spawngroupID = sg.id
      left join (
        select short_name, min(long_name) as long_name
        from zone
        where coalesce(version, 0) = 0
          and coalesce(min_status, 0) <= ${publicZoneStatusCeiling}
        group by short_name
      ) z on z.short_name = s2.zone
      where nt.id = ${id}
      group by nt.id, nt.name, nt.lastname, nt.race, nt.gender, nt.texture, nt.helmtexture, nt.level, nt.class, nt.hp, nt.mana, nt.mindmg, nt.maxdmg,
               nt.npc_faction_id, nt.npc_spells_id, nt.loottable_id, nt.merchant_id, nt.npcspecialattks, nt.attack_delay,
               fl.id, fl.name
    `.execute(db!);

    const row = result.rows[0];

    if (!row) return undefined;

    const [spellRows, dropRows, sellRows, spawnZoneRows, factionRows] = await Promise.all([
      row.npc_spells_id
        ? sql<{ spellid: number; type: number; name: string; new_icon: number }>`
            select nse.spellid, nse.type, s.name, s.new_icon
            from npc_spells_entries nse
            join spells_new s on s.id = nse.spellid
            where nse.npc_spells_id = ${row.npc_spells_id}
              and nse.minlevel <= ${row.level}
              and nse.maxlevel >= ${row.level}
            order by nse.priority desc, s.name asc
          `.execute(db!)
        : Promise.resolve({ rows: [] as Array<{ spellid: number; type: number; name: string; new_icon: number }> }),
      row.loottable_id
        ? sql<{
            lootdrop_id: number;
            probability: number;
            multiplier: number;
            item_id: number;
            chance: number;
            name: string;
            itemtype: number;
            icon: number;
          }>`
            select lte.lootdrop_id, lte.probability, lte.multiplier, lde.item_id, lde.chance,
                   i.Name as name, i.itemtype, i.icon
            from loottable_entries lte
            join lootdrop_entries lde on lde.lootdrop_id = lte.lootdrop_id
            join items i on i.id = lde.item_id
            where lte.loottable_id = ${row.loottable_id}
              and ${discoveredItemClause("i.id")}
            order by lte.lootdrop_id asc, i.Name asc
          `.execute(db!)
        : Promise.resolve({
            rows: [] as Array<{
              lootdrop_id: number;
              probability: number;
              multiplier: number;
              item_id: number;
              chance: number;
              name: string;
              itemtype: number;
              icon: number;
            }>
          }),
      row.merchant_id
        ? sql<{ id: number; name: string; icon: number; price: number; ldonprice: number }>`
            select i.id, i.Name as name, i.icon, i.price, i.ldonprice
            from merchantlist ml
            join items i on i.id = ml.item
            where ml.merchantid = ${row.merchant_id}
              and ${discoveredItemClause("i.id")}
            order by ml.slot asc
          `.execute(db!)
        : Promise.resolve({ rows: [] as Array<{ id: number; name: string; icon: number; price: number; ldonprice: number }> }),
      sql<{ short_name: string; long_name: string | null }>`
        select distinct s2.zone as short_name, z.long_name
        from spawnentry se
        join spawngroup sg on sg.id = se.spawngroupID
        join spawn2 s2 on s2.spawngroupID = sg.id
        left join (
          select short_name, min(long_name) as long_name
          from zone
          where coalesce(version, 0) = 0
            and coalesce(min_status, 0) <= ${publicZoneStatusCeiling}
          group by short_name
        ) z on z.short_name = s2.zone
        where se.npcID = ${id}
        order by short_name asc
      `.execute(db!),
      row.npc_faction_id
        ? sql<{ id: number; name: string; value: number }>`
            select fl.id, fl.name, nfe.value
            from npc_faction_entries nfe
            join faction_list fl on fl.id = nfe.faction_id
            where nfe.npc_faction_id = ${row.npc_faction_id}
            order by nfe.value desc, fl.name asc
          `.execute(db!)
        : Promise.resolve({ rows: [] as Array<{ id: number; name: string; value: number }> })
    ]);

    const dropGroups = new Map<
      number,
      {
        lootdropId: number;
        probability: number;
        multiplier: number;
        items: Array<{ id: number; name: string; href: string; type: string; icon: string; chance: number; globalChance: number }>;
      }
    >();

    for (const entry of dropRows.rows) {
      if (!dropGroups.has(entry.lootdrop_id)) {
        dropGroups.set(entry.lootdrop_id, {
          lootdropId: entry.lootdrop_id,
          probability: Number(entry.probability ?? 0),
          multiplier: Number(entry.multiplier ?? 1),
          items: []
        });
      }

      dropGroups.get(entry.lootdrop_id)?.items.push({
        id: entry.item_id,
        name: entry.name,
        href: `/items/${entry.item_id}`,
        type: formatDetailedItemType(entry.itemtype),
        icon: String(entry.icon ?? 0),
        chance: Number(entry.chance ?? 0),
        globalChance: (Number(entry.chance ?? 0) * Number(entry.probability ?? 0)) / 100
      });
    }

    const detail: NpcDetail = {
      id: row.id,
      name: formatNpcName(row.name),
      fullName: [formatNpcName(row.name), normalizeText(row.lastname ?? "")].filter(Boolean).join(" "),
      appearance: {
        raceId: Number(row.race ?? 0),
        gender: Number(row.gender ?? 0),
        texture: Number(row.texture ?? 0),
        helmTexture: Number(row.helmtexture ?? 0)
      },
      race: formatRace(row.race),
      level: String(row.level),
      zone: row.zone_name ?? "Unknown",
      named: isNamedNpcName(row.name),
      klass: formatNpcClass(row.class),
      hp: Number(row.hp ?? 0),
      mana: Number(row.mana ?? 0),
      damage: `${row.mindmg ?? 0} - ${row.maxdmg ?? 0}`,
      faction: row.primary_faction_name ?? "Unknown",
      mainFaction: row.primary_faction_id && row.primary_faction_name
        ? { id: row.primary_faction_id, name: row.primary_faction_name, href: `/factions/${row.primary_faction_id}` }
        : null,
      attackDelay: Number(row.attack_delay ?? 0),
      specialAttacks: decodeNpcSpecialAttacks(row.npcspecialattks),
      spells: spellRows.rows.map((entry) => ({
        id: entry.spellid,
        name: String(entry.name),
        href: `/spells/${entry.spellid}`,
        type: formatNpcSpellType(entry.type),
        icon: String(entry.new_icon ?? 0)
      })),
      drops: [...dropGroups.values()],
      sells: sellRows.rows.map((entry) => ({
        id: entry.id,
        name: entry.name,
        href: `/items/${entry.id}`,
        icon: String(entry.icon ?? 0),
        price: row.class === 61 ? `${entry.ldonprice ?? 0} points` : formatCoinString(entry.price)
      })),
      spawnGroups: [],
      spawnZones: spawnZoneRows.rows.map((entry) => ({
        shortName: entry.short_name,
        longName: entry.long_name ?? entry.short_name,
        href: `/zones/${entry.short_name}`
      })),
      factionHits: {
        lowers: factionRows.rows
          .filter((entry) => Number(entry.value) < 0)
          .map((entry) => ({ id: entry.id, name: entry.name, href: `/factions/${entry.id}`, value: Number(entry.value) })),
        raises: factionRows.rows
          .filter((entry) => Number(entry.value) > 0)
          .map((entry) => ({ id: entry.id, name: entry.name, href: `/factions/${entry.id}`, value: Number(entry.value) }))
      }
    };
    return detail;
  }, () => buildNpcDetailFallback(id));
}

export async function listZones(filters: ZoneFilters = {}) {
  return withDatabaseFallback(async () => {
    const rows = await sql<{ short_name: string; long_name: string; zoneidnumber: number; expansion: number; min_level: number; max_level: number; note: string | null; spawns: number }>`
      select z.short_name, z.long_name, z.zoneidnumber, z.expansion, z.min_level, z.max_level, z.note, count(s2.id) as spawns
      from zone z
      left join spawn2 s2 on s2.zone = z.short_name and s2.version = z.version
      where coalesce(z.version, 0) = 0
        and coalesce(z.min_status, 0) <= ${publicZoneStatusCeiling}
        and (z.short_name like ${like(filters.q)} or z.long_name like ${like(filters.q)})
      group by z.short_name, z.long_name, z.zoneidnumber, z.expansion, z.min_level, z.max_level, z.note
      order by z.long_name asc
    `.execute(db!);

    return rows.rows
      .map((row) => ({
        id: row.zoneidnumber,
        shortName: row.short_name,
        longName: row.long_name,
        spawns: Number(row.spawns ?? 0),
        era: formatZoneEra(row.short_name, row.expansion),
        levelRange: formatLevelRange(row.min_level, row.max_level),
        population: row.note?.trim() || "Live zone data"
      }))
      .filter((zone) => matchesZoneEraFilter(zone, filters.era));
  }, () => summarizeZones().filter((zone) => {
    if (!includesFolded(zone.longName, filters.q) && !includesFolded(zone.shortName, filters.q)) return false;
    if (!matchesZoneEraFilter(zone, filters.era)) return false;
    return true;
  }));
}

export async function listZoneEras() {
  return getZoneEraLabels();
}

export async function getZonesByEra(era: string) {
  const all = await listZones();
  return all.filter((zone) => matchesZoneEraFilter(zone, era));
}

export async function getZonesByLevel() {
  return withDatabaseFallback(async () => {
    const rows = await sql<{
      zoneidnumber: number;
      short_name: string;
      long_name: string;
      expansion: number;
      hotzone: number;
      bucket: number | null;
      npc_count: number;
    }>`
      select
        z.zoneidnumber,
        z.short_name,
        z.long_name,
        z.expansion,
        z.hotzone,
        floor((nt.level - 1) / ${zoneLevelBandSize}) as bucket,
        count(distinct nt.id) as npc_count
      from zone z
      left join spawn2 s2 on s2.zone = z.short_name and s2.version = z.version
      left join spawngroup sg on sg.id = s2.spawngroupID
      left join spawnentry se on se.spawngroupID = sg.id
      left join npc_types nt on nt.id = se.npcID
        and nt.level > 1
        and nt.level <= ${zoneLevelBandMaximum}
        and nt.race not in (127, 240)
      where coalesce(z.version, 0) = 0
        and coalesce(z.min_status, 0) <= ${publicZoneStatusCeiling}
      group by z.zoneidnumber, z.short_name, z.long_name, z.expansion, z.hotzone, bucket
      order by z.long_name asc, bucket asc
    `.execute(db!);

    const zonesById = new Map<number, ZoneByLevelSummary>();

    for (const row of rows.rows) {
      let zone = zonesById.get(row.zoneidnumber);
      if (!zone) {
        zone = {
          id: row.zoneidnumber,
          shortName: row.short_name,
          longName: row.long_name,
          era: formatZoneEra(row.short_name, row.expansion),
          hotzone: Number(row.hotzone ?? 0) > 0,
          suggestedLevel: "Unknown",
          bands: createZoneLevelBands(new Map())
        };
        zonesById.set(row.zoneidnumber, zone);
      }

      if (row.bucket === null) {
        continue;
      }

      const band = zone.bands[row.bucket];
      if (band) {
        band.npcCount = Number(row.npc_count ?? 0);
        band.isSignificant = band.npcCount >= zoneLevelBandSignificanceFloor;
      }
    }

    const zones = Array.from(zonesById.values()).map((zone) => ({
      ...zone,
      suggestedLevel: calculateSuggestedZoneLevel(zone.bands)
    }));

    zones.sort((left, right) => {
      const sortDelta = sortValueForZoneLevelBands(left.bands) - sortValueForZoneLevelBands(right.bands);
      if (sortDelta !== 0) return sortDelta;
      return left.longName.localeCompare(right.longName);
    });

    return zones;
  }, () => {
    return summarizeZones()
      .map<ZoneByLevelSummary>((zone) => {
        const bucketCounts = new Map<number, number>();
        const digits = zone.levelRange.match(/\d+/g)?.map(Number) ?? [];
        const minLevel = digits[0] ?? 1;
        const maxLevel = digits[1] ?? digits[0] ?? zoneLevelBandSize;

        if (Number.isFinite(minLevel) && Number.isFinite(maxLevel)) {
          const startBand = Math.max(0, Math.floor((Math.max(1, minLevel) - 1) / zoneLevelBandSize));
          const endBand = Math.max(startBand, Math.floor((Math.max(minLevel, maxLevel) - 1) / zoneLevelBandSize));
          for (let band = startBand; band <= endBand; band += 1) {
            bucketCounts.set(band, zoneLevelBandSignificanceFloor);
          }
        }

        const bands = createZoneLevelBands(bucketCounts);

        return {
          id: zone.id,
          shortName: zone.shortName,
          longName: zone.longName,
          era: zone.era,
          hotzone: false,
          suggestedLevel: zone.levelRange,
          bands
        };
      })
      .sort((left, right) => {
        const sortDelta = sortValueForZoneLevelBands(left.bands) - sortValueForZoneLevelBands(right.bands);
        if (sortDelta !== 0) return sortDelta;
        return left.longName.localeCompare(right.longName);
      });
  });
}

export async function getZoneDetail(shortName: string): Promise<ZoneDetail | undefined> {
  return withDatabaseFallback(async () => {
    const result = await sql<{
      short_name: string;
      long_name: string;
      zoneidnumber: number;
      version: number;
      expansion: number;
      min_level: number;
      max_level: number;
      note: string | null;
      safe_x: number;
      safe_y: number;
      safe_z: number;
      hotzone: number;
      canbind: number;
      canlevitate: number;
      castoutdoor: number;
    }>`
      select short_name, long_name, zoneidnumber, version, expansion, min_level, max_level, note, safe_x, safe_y, safe_z,
             hotzone, canbind, canlevitate, castoutdoor
      from zone
      where short_name = ${shortName}
        and version = 0
        and coalesce(min_status, 0) <= ${publicZoneStatusCeiling}
      limit 1
    `.execute(db!);

    const zone = result.rows[0];

    if (!zone) return undefined;

    const spawnVersions = [...new Set([Number(zone.version ?? 0), -1])];

    const [bestiaryRows, itemRows, forageRows, spawnLocationRows, spawnEntryRows] = await Promise.all([
      sql<{
        id: number;
        raw_name: string;
        min_level: number;
        max_level: number;
        race: number;
        class: number;
        variants: number;
      }>`
        select min(nt.id) as id,
               nt.name as raw_name,
               min(nt.level) as min_level,
               max(coalesce(nullif(nt.maxlevel, 0), nt.level)) as max_level,
               min(nt.race) as race,
               min(nt.class) as class,
               count(distinct nt.id) as variants
        from npc_types nt
        join spawnentry se on se.npcID = nt.id
        join spawngroup sg on sg.id = se.spawngroupID
        join spawn2 s2 on s2.spawngroupID = sg.id
        where s2.zone = ${shortName}
          and s2.version in (${sql.join(spawnVersions.map((value) => sql`${value}`), sql`, `)})
          and nt.trackable > 0
          and nt.race not in (127, 240)
        group by nt.name
        order by nt.name asc
      `.execute(db!),
      sql<{
        id: number;
        name: string;
        icon: number;
        itemclass: number;
        itemtype: number;
        damage: number;
      }>`
        select distinct i.id, i.Name as name, i.icon, i.itemclass, i.itemtype, i.damage
        from items i
        join lootdrop_entries lde on lde.item_id = i.id
        join loottable_entries lte on lte.lootdrop_id = lde.lootdrop_id
        join npc_types nt on nt.loottable_id = lte.loottable_id
        join spawnentry se on se.npcID = nt.id
        join spawngroup sg on sg.id = se.spawngroupID
        join spawn2 s2 on s2.spawngroupID = sg.id
        where s2.zone = ${shortName}
          and s2.version in (${sql.join(spawnVersions.map((value) => sql`${value}`), sql`, `)})
          and ${discoveredItemClause("i.id")}
          and nt.class not in (${sql.join(merchantNpcClasses.map((value) => sql`${value}`), sql`, `)})
        order by i.Name asc
      `.execute(db!),
      sql<{
        id: number;
        name: string;
        icon: number;
        level: number;
        chance: number;
      }>`
        select i.id,
               i.Name as name,
               i.icon,
               max(f.level) as level,
               max(f.chance) as chance
        from forage f
        join zone z on z.zoneidnumber = f.zoneid and z.version = 0
        join items i on i.id = f.Itemid
        where z.short_name = ${shortName}
          and coalesce(z.min_status, 0) <= ${publicZoneStatusCeiling}
          and ${discoveredItemClause("i.id")}
        group by i.id, i.Name, i.icon
        order by i.Name asc
      `.execute(db!),
      sql<{
        id: number;
        name: string;
        x: number;
        y: number;
        z: number;
        respawntime: number;
      }>`
        select sg.id, sg.name, s2.x, s2.y, s2.z, s2.respawntime
        from spawn2 s2
        join spawngroup sg on sg.id = s2.spawngroupID
        where s2.zone = ${shortName}
          and s2.version in (${sql.join(spawnVersions.map((value) => sql`${value}`), sql`, `)})
        order by sg.name asc, s2.id asc
      `.execute(db!),
      sql<{
        spawngroupID: number;
        id: number;
        name: string;
        chance: number;
      }>`
        select distinct se.spawngroupID, nt.id, nt.name, se.chance
        from spawnentry se
        join npc_types nt on nt.id = se.npcID
        join spawn2 s2 on s2.spawngroupID = se.spawngroupID
        where s2.zone = ${shortName}
          and s2.version in (${sql.join(spawnVersions.map((value) => sql`${value}`), sql`, `)})
        order by se.spawngroupID asc, nt.name asc
      `.execute(db!)
    ]);

    const bestiary = bestiaryRows.rows
      .map((row) => {
        const name = formatNpcName(row.raw_name);

        return {
          id: row.id,
          name,
          href: `/npcs/${row.id}`,
          levelRange: formatLevelRange(row.min_level, row.max_level),
          race: formatRace(row.race),
          klass: formatNpcClass(row.class),
          classification: formatNpcClassification(row.raw_name),
          named: isNamedNpcName(name),
          variants: Number(row.variants ?? 1)
        };
      })
      .filter((entry) => entry.name.length > 0);

    const encounterLevels = bestiaryRows.rows.flatMap((row) => {
      const levels = [Number(row.min_level ?? 0), Number(row.max_level ?? 0)].filter((value) => value > 0);
      return levels;
    });
    const encounterRange =
      encounterLevels.length > 0
        ? formatLevelRange(Math.min(...encounterLevels), Math.max(...encounterLevels))
        : formatLevelRange(zone.min_level, zone.max_level);

    const recommendedRange = formatLevelRange(zone.min_level, zone.max_level);
    const displayRange = recommendedRange === "All levels" ? encounterRange : recommendedRange;

    const namedNpcs = bestiary
      .filter((entry) => entry.named)
      .map((entry) => ({ id: entry.id, name: entry.name, href: entry.href }));

    const itemDrops = itemRows.rows.map((row) => ({
      id: row.id,
      name: row.name,
      href: `/items/${row.id}`,
      icon: String(row.icon ?? ""),
      type: formatDetailedItemType(row.itemtype ?? row.itemclass)
    }));

    const forage = forageRows.rows.map((row) => ({
      id: row.id,
      name: row.name,
      href: `/items/${row.id}`,
      icon: String(row.icon ?? ""),
      chance: Number(row.chance ?? 0),
      skill: Number(row.level ?? 0)
    }));

    const spawnGroupMap = new Map<number, SpawnGroupDetail>();

    for (const row of spawnLocationRows.rows) {
      if (!spawnGroupMap.has(row.id)) {
        spawnGroupMap.set(row.id, {
          id: row.id,
          name: row.name,
          zone: { shortName: zone.short_name, longName: zone.long_name, href: `/zones/${zone.short_name}` },
          respawn: formatSeconds(Number(row.respawntime ?? 0)),
          locations: [],
          entries: []
        });
      }

      const group = spawnGroupMap.get(row.id);
      const location = `${Math.round(Number(row.y ?? 0))} / ${Math.round(Number(row.x ?? 0))} / ${Math.round(Number(row.z ?? 0))}`;
      if (group && !group.locations.includes(location)) {
        group.locations.push(location);
      }
    }

    for (const row of spawnEntryRows.rows) {
      const group = spawnGroupMap.get(row.spawngroupID);
      if (!group) continue;

      if (!group.entries.some((entry) => entry.id === row.id)) {
        group.entries.push({
          id: row.id,
          name: formatNpcName(row.name),
          chance: `${Number(row.chance ?? 0)}%`,
          href: `/npcs/${row.id}`
        });
      }
    }

    const spawnGroups = [...spawnGroupMap.values()];
    const rules = [
      Number(zone.canbind ?? 0) > 0 ? "Binding allowed" : "No binding",
      Number(zone.canlevitate ?? 0) > 0 ? "Levitate allowed" : "Levitate blocked",
      Number(zone.castoutdoor ?? 0) > 0 ? "Outdoor casting" : "Indoor casting rules"
    ];
    if (Number(zone.hotzone ?? 0) > 0) {
      rules.unshift("Hotzone bonus");
    }

    const resources = [
      {
        label: "Bestiary",
        href: `/zones/${shortName}?mode=npcs`,
        count: bestiary.length,
        description: "Creature roster, level spread, and dispositions.",
        mode: "npcs" as const
      },
      ...(namedNpcs.length > 0
        ? [
            {
              label: "Named mobs",
              href: `/zones/${shortName}?mode=named`,
              count: namedNpcs.length,
              description: "Focused named encounter list.",
              mode: "named" as const
            }
          ]
        : []),
      ...(itemDrops.length > 0
        ? [
            {
              label: "Equipment",
              href: `/zones/${shortName}?mode=items`,
              count: itemDrops.length,
              description: "Distinct items dropped in the zone.",
              mode: "items" as const
            }
          ]
        : []),
      ...(forage.length > 0
        ? [
            {
              label: "Forage",
              href: `/zones/${shortName}?mode=forage`,
              count: forage.length,
              description: "Gatherables and forage table entries.",
              mode: "forage" as const
            }
          ]
        : [])
    ];

    const detail: ZoneDetail = {
      id: zone.zoneidnumber,
      shortName: zone.short_name,
      longName: zone.long_name,
      spawns: bestiary.length,
      hotzone: Number(zone.hotzone ?? 0) > 0,
      era: formatZoneEra(zone.short_name, zone.expansion),
      levelRange: displayRange,
      population: zone.note?.trim() || `${bestiary.length} creatures indexed across ${spawnLocationRows.rows.length} spawn points.`,
      safePoint: `${Math.floor(zone.safe_x ?? 0)} / ${Math.floor(zone.safe_y ?? 0)} / ${Math.floor(zone.safe_z ?? 0)}`,
      encounterRange,
      spawnPoints: spawnLocationRows.rows.length,
      rules,
      resources,
      bestiary,
      namedNpcs,
      itemDrops,
      forage,
      tasks: [],
      spawnGroups
    };
    return detail;
  }, () => zones.find((zone) => zone.shortName === shortName));
}

type FactionRelationshipFilter = "raises" | "lowers" | "both" | "none";

export type FactionFilters = {
  q?: string;
  zone?: string;
  relationship?: FactionRelationshipFilter;
};

export async function listFactions(filters: FactionFilters = {}) {
  return withDatabaseFallback(async () => {
    const clauses = [sql`1 = 1`];
    const trimmedQuery = filters.q?.trim();
    const numericQuery = trimmedQuery && /^\d+$/.test(trimmedQuery) ? Number(trimmedQuery) : null;

    if (trimmedQuery) {
      clauses.push(
        numericQuery !== null
          ? sql`(fl.name like ${like(trimmedQuery)} or fl.id = ${numericQuery})`
          : sql`fl.name like ${like(trimmedQuery)}`
      );
    }

    if (filters.zone?.trim()) {
      clauses.push(sql`coalesce(zone_info.zone_name, '—') like ${like(filters.zone)}`);
    }

    if (filters.relationship === "raises") {
      clauses.push(sql`coalesce(relationship_info.raised_by_count, 0) > 0`);
    } else if (filters.relationship === "lowers") {
      clauses.push(sql`coalesce(relationship_info.lowered_by_count, 0) > 0`);
    } else if (filters.relationship === "both") {
      clauses.push(sql`coalesce(relationship_info.raised_by_count, 0) > 0 and coalesce(relationship_info.lowered_by_count, 0) > 0`);
    } else if (filters.relationship === "none") {
      clauses.push(sql`coalesce(relationship_info.raised_by_count, 0) = 0 and coalesce(relationship_info.lowered_by_count, 0) = 0`);
    }

    const rows = await sql<{
      id: number;
      name: string;
      aligned_zone: string | null;
      raised_by_count: number | string | null;
      lowered_by_count: number | string | null;
    }>`
      select fl.id,
             fl.name,
             zone_info.zone_name as aligned_zone,
             relationship_info.raised_by_count,
             relationship_info.lowered_by_count
      from faction_list fl
      left join (
        select nf.primaryfaction as faction_id,
               min(z.long_name) as zone_name
        from npc_faction nf
        join npc_types nt on nt.npc_faction_id = nf.id
        join spawnentry se on se.npcID = nt.id
        join spawngroup sg on sg.id = se.spawngroupID
        join spawn2 s2 on s2.spawngroupID = sg.id
        left join (
          select short_name, min(long_name) as long_name
          from zone
          where coalesce(version, 0) = 0
            and coalesce(min_status, 0) <= ${publicZoneStatusCeiling}
          group by short_name
        ) z on z.short_name = s2.zone
        group by nf.primaryfaction
      ) zone_info on zone_info.faction_id = fl.id
      left join (
        select nfe.faction_id,
               count(distinct case when nfe.value > 0 then nt.id end) as raised_by_count,
               count(distinct case when nfe.value < 0 then nt.id end) as lowered_by_count
        from npc_faction_entries nfe
        join npc_faction nf on nf.id = nfe.npc_faction_id
        join npc_types nt on nt.npc_faction_id = nf.id
        group by nfe.faction_id
      ) relationship_info on relationship_info.faction_id = fl.id
      where ${sql.join(clauses, sql` and `)}
      order by fl.name asc
    `.execute(db!);

    return rows.rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: "Faction",
      alignedZone: row.aligned_zone ?? "—",
      raisedByCount: Number(row.raised_by_count ?? 0),
      loweredByCount: Number(row.lowered_by_count ?? 0)
    }));
  }, () =>
    summarizeFactions().filter((faction) => {
      const query = filters.q?.trim();
      const matchesQuery =
        !query || includesFolded(faction.name, query) || String(faction.id) === query;
      const matchesZone = !filters.zone?.trim() || includesFolded(faction.alignedZone, filters.zone);

      const matchesRelationship =
        !filters.relationship ||
        (filters.relationship === "raises" && faction.raisedByCount > 0) ||
        (filters.relationship === "lowers" && faction.loweredByCount > 0) ||
        (filters.relationship === "both" && faction.raisedByCount > 0 && faction.loweredByCount > 0) ||
        (filters.relationship === "none" && faction.raisedByCount === 0 && faction.loweredByCount === 0);

      return matchesQuery && matchesZone && matchesRelationship;
    })
  );
}

export async function getFactionDetail(id: number): Promise<FactionDetail | undefined> {
  return withDatabaseFallback(async () => {
    const factionResult = await sql<{ id: number; name: string }>`
      select id, name
      from faction_list
      where id = ${id}
      limit 1
    `.execute(db!);

    const row = factionResult.rows[0];
    if (!row) {
      return undefined;
    }

    const [zoneRows, raisedRows, loweredRows] = await Promise.all([
      sql<{ zone_name: string | null }>`
        select min(z.long_name) as zone_name
        from npc_faction nf
        join npc_types nt on nt.npc_faction_id = nf.id
        join spawnentry se on se.npcID = nt.id
        join spawngroup sg on sg.id = se.spawngroupID
        join spawn2 s2 on s2.spawngroupID = sg.id
        left join (
          select short_name, min(long_name) as long_name
          from zone
          where coalesce(version, 0) = 0
            and coalesce(min_status, 0) <= ${publicZoneStatusCeiling}
          group by short_name
        ) z on z.short_name = s2.zone
        where nf.primaryfaction = ${id}
      `.execute(db!),
      sql<{ id: number; name: string }>`
        select distinct nt.id, nt.name
        from npc_faction_entries nfe
        join npc_faction nf on nf.id = nfe.npc_faction_id
        join npc_types nt on nt.npc_faction_id = nf.id
        where nfe.faction_id = ${id} and nfe.value > 0
        order by nt.name asc
      `.execute(db!),
      sql<{ id: number; name: string }>`
        select distinct nt.id, nt.name
        from npc_faction_entries nfe
        join npc_faction nf on nf.id = nfe.npc_faction_id
        join npc_types nt on nt.npc_faction_id = nf.id
        where nfe.faction_id = ${id} and nfe.value < 0
        order by nt.name asc
      `.execute(db!)
    ]);

    const alignedZone = zoneRows.rows[0]?.zone_name ?? "—";

    return {
      id: row.id,
      name: row.name,
      category: "Faction",
      alignedZone,
      raisedByCount: raisedRows.rows.length,
      loweredByCount: loweredRows.rows.length,
      overview:
        alignedZone !== "—"
          ? `${row.name} is a tracked faction with NPC presence aligned to ${alignedZone}.`
          : `${row.name} is a tracked faction in the EQEmu data set.`,
      raisedBy: raisedRows.rows.map((entry) => ({ id: entry.id, name: entry.name, href: `/npcs/${entry.id}` })),
      loweredBy: loweredRows.rows.map((entry) => ({ id: entry.id, name: entry.name, href: `/npcs/${entry.id}` }))
    };
  }, () => factions.find((faction) => faction.id === id));
}

export async function listRecipes(filters: RecipeFilters = {}) {
  return withDatabaseFallback(async () => {
    const clauses = [sql`1 = 1`];
    const isPoisonSearch = Boolean(filters.tradeskill && includesFolded("Poison", filters.tradeskill));

    if (filters.q) {
      clauses.push(sql`name like ${like(filters.q)}`);
    }

    const tradeskillIds = resolveRecipeTradeskillIds(filters.tradeskill);
    if (isPoisonSearch) {
      clauses.push(sql`
        (
          tradeskill = 56
          or (
            tradeskill = 75
            and exists (
              select 1
              from tradeskill_recipe_entries poison_entries
              join items poison_items on poison_items.id = poison_entries.item_id
              where poison_entries.recipe_id = tradeskill_recipe.id
                and poison_entries.iscontainer = 1
                and ${discoveredItemClause("poison_items.id")}
                and poison_items.Name like '%Poison%'
            )
          )
        )
      `);
    } else if (tradeskillIds.length === 1) {
      clauses.push(sql`tradeskill = ${tradeskillIds[0]}`);
    } else if (tradeskillIds.length > 1) {
      clauses.push(sql`tradeskill in (${sql.join(tradeskillIds.map((id) => sql`${id}`), sql`, `)})`);
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

export async function getRecipeDetail(id: number): Promise<RecipeDetail | undefined> {
  return withDatabaseFallback(async () => {
    const recipeResult = await sql<{
      id: number;
      name: string;
      tradeskill: number;
      trivial: number;
      notes: string | null;
    }>`
      select id, name, tradeskill, trivial, notes
      from tradeskill_recipe
      where id = ${id}
      limit 1
    `.execute(db!);

    const row = recipeResult.rows[0];
    if (!row) {
      return undefined;
    }

    const entryRows = await sql<{
      item_id: number;
      successcount: number;
      componentcount: number;
      iscontainer: number;
      item_name: string | null;
      item_icon: number | null;
    }>`
      select tre.item_id, tre.successcount, tre.componentcount, tre.iscontainer, i.Name as item_name, i.icon as item_icon
      from tradeskill_recipe_entries tre
      left join items i on i.id = tre.item_id
        and ${discoveredItemClause("i.id")}
      where tre.recipe_id = ${id}
      order by tre.id asc
    `.execute(db!);

    const rawContainers = entryRows.rows
      .filter((entry) => Number(entry.iscontainer ?? 0) === 1)
      .reduce<Array<{ id: number; name: string; href?: string; icon: string }>>((accumulator, entry) => {
        if (accumulator.some((container) => container.id === entry.item_id)) {
          return accumulator;
        }

        accumulator.push({
          id: entry.item_id,
          name: entry.item_name?.trim() || staticTradeskillContainers[entry.item_id]?.name || `Item ${entry.item_id}`,
          href: entry.item_name ? `/items/${entry.item_id}` : undefined,
          icon: String(entry.item_icon ?? staticTradeskillContainers[entry.item_id]?.icon ?? "")
        });

        return accumulator;
      }, []);
    const resolvedContainers = rawContainers.filter((entry) => entry.href || entry.icon);
    const containers = resolvedContainers.length > 0 ? resolvedContainers : rawContainers;

    const creates = entryRows.rows
      .filter((entry) => Number(entry.successcount ?? 0) > 0 && Boolean(entry.item_name))
      .map((entry) => ({
        id: entry.item_id,
        name: entry.item_name?.trim() || `Item ${entry.item_id}`,
        href: `/items/${entry.item_id}`,
        count: Number(entry.successcount ?? 0),
        icon: String(entry.item_icon ?? "")
      }));

    const ingredients = entryRows.rows
      .filter((entry) => Number(entry.componentcount ?? 0) > 0 && Boolean(entry.item_name))
      .map((entry) => ({
        id: entry.item_id,
        name: entry.item_name?.trim() || `Item ${entry.item_id}`,
        href: `/items/${entry.item_id}`,
        count: Number(entry.componentcount ?? 0),
        icon: String(entry.item_icon ?? "")
      }));

    return {
      id: row.id,
      name: row.name,
      tradeskill: formatTradeskill(row.tradeskill),
      trivial: Number(row.trivial ?? 0),
      result: creates.length > 0 ? creates.map((entry) => `${entry.name}${entry.count > 1 ? ` x${entry.count}` : ""}`).join(", ") : "—",
      container: containers.length > 0 ? containers.map((entry) => entry.name).join(", ") : "Unknown",
      notes: row.notes?.trim() || "No notes are recorded for this recipe.",
      containers,
      creates,
      ingredients
    };
  }, () => recipes.find((recipe) => recipe.id === id));
}

export async function listPets(filters: PetFilters = {}): Promise<PetSummary[]> {
  return withDatabaseFallback(async () => {
    const requestedClasses = (filters.classNames?.length ? filters.classNames : filters.className ? [filters.className] : [])
      .map((entry) => entry.trim())
      .filter(Boolean);
    const classIds = [...new Set(requestedClasses.map((entry) => classIdFromName(entry)).filter((entry) => entry > 0))];

    if (classIds.length === 0) {
      return [];
    }

    const allRows = await Promise.all(
      classIds.map(async (classId) => {
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
      })
    );

    return [...new Map(
      allRows
        .flat()
        .sort((left, right) =>
          left.ownerClassId - right.ownerClassId ||
          left.spellLevel - right.spellLevel ||
          left.spellName.localeCompare(right.spellName)
        )
        .map((entry) => [`${entry.ownerClassId}:${entry.spellId}`, entry])
    ).values()];
  }, () =>
    pets
      .filter((pet) => {
        if (filters.classNames?.length) {
          return filters.classNames.some((className) => includesFolded(pet.ownerClass, className));
        }
        return !filters.className || includesFolded(pet.ownerClass, filters.className);
      })
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
