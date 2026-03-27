import { cacheGet, cacheSet } from "./cache";
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

type ItemFilters = { q?: string; className?: string; slot?: string; tradeable?: boolean };
type SpellFilters = { q?: string; className?: string; level?: number };
type NpcFilters = { q?: string; zone?: string; minLevel?: number; maxLevel?: number; race?: string; named?: boolean };
type ZoneFilters = { q?: string; era?: string };
type RecipeFilters = { q?: string; tradeskill?: string };

const sourceMode = useMockData() ? "mock" : "hybrid";
const db = getDb();
const databaseEnabled = !useMockData() && Boolean(db);

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

function decodeClassMask(mask: number | null | undefined) {
  if (!mask || mask <= 0 || mask >= 65535) {
    return ["All"];
  }

  const classes = classNames.filter((_, index) => (mask & (1 << index)) !== 0);
  return classes.length > 0 ? [...classes] : ["All"];
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

function summarizeItems(): ItemSummary[] {
  return items.map(({ id, name, type, slot, classes, tradeable, levelRequired, zone }) => ({
    id,
    name,
    type,
    slot,
    classes,
    tradeable,
    levelRequired,
    zone
  }));
}

function summarizeSpells(): SpellSummary[] {
  return spells.map(({ id, name, classes, level, skill, effect }) => ({
    id,
    name,
    classes,
    level,
    skill,
    effect
  }));
}

function summarizeNpcs(): NpcSummary[] {
  return npcs.map(({ id, name, race, level, zone, named }) => ({
    id,
    name,
    race,
    level,
    zone,
    named
  }));
}

function summarizeZones(): ZoneSummary[] {
  return zones.map(({ shortName, longName, era, levelRange, population }) => ({
    shortName,
    longName,
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

  const hits = await withDatabaseFallback(async () => {
    const [itemRows, spellRows, npcRows, zoneRows] = await Promise.all([
      sql<{ id: number; name: string; itemclass: number; itemtype: number; slots: number; damage: number }>`
        select id, Name as name, itemclass, itemtype, slots, damage
        from items
        where Name like ${like(query)}
        order by Name asc
        limit 8
      `.execute(db!),
      sql<Record<string, unknown>>`
        select id, name, skill, classes1, classes2, classes3, classes4, classes5, classes6, classes7, classes8,
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
        tags: []
      });
    }

    for (const row of spellRows.rows) {
      const classes = spellClassesFromRow(row);
      dbHits.push({
        id: String(row.id),
        type: "spell",
        title: String(row.name),
        href: `/spells/${row.id}`,
        subtitle: `${formatSpellSkill(Number(row.skill ?? 0))} • L${Math.min(...classes.map((entry) => entry.level), 255)}`,
        tags: classes.slice(0, 3).map((entry) => entry.klass)
      });
    }

    for (const row of npcRows.rows) {
      dbHits.push({
        id: String(row.id),
        type: "npc",
        title: row.name,
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

    return dbHits;
  }, async () => {
    const fallbackHits: SearchHit[] = [];
    for (const item of summarizeItems()) {
      if (includesFolded(item.name, query)) fallbackHits.push({ id: String(item.id), type: "item", title: item.name, href: `/items/${item.id}`, subtitle: `${item.type} • ${item.slot}`, tags: [item.zone] });
    }
    for (const spell of summarizeSpells()) {
      if (includesFolded(spell.name, query)) fallbackHits.push({ id: String(spell.id), type: "spell", title: spell.name, href: `/spells/${spell.id}`, subtitle: `${spell.skill} • L${spell.level}`, tags: spell.classes });
    }
    for (const npc of summarizeNpcs()) {
      if (includesFolded(npc.name, query)) fallbackHits.push({ id: String(npc.id), type: "npc", title: npc.name, href: `/npcs/${npc.id}`, subtitle: `${npc.race} • ${npc.level}`, tags: [npc.zone, npc.named ? "Named" : "Common"] });
    }
    for (const zone of summarizeZones()) {
      if (includesFolded(zone.longName, query) || includesFolded(zone.shortName, query)) fallbackHits.push({ id: zone.shortName, type: "zone", title: zone.longName, href: `/zones/${zone.shortName}`, subtitle: `${zone.era} • ${zone.levelRange}`, tags: [zone.population] });
    }
    return fallbackHits;
  });

  await cacheSet(key, hits, 60);
  return hits;
}

export async function listItems(filters: ItemFilters = {}) {
  return withDatabaseFallback(async () => {
    const rows = await sql<{ id: number; name: string; itemclass: number; itemtype: number; slots: number; classes: number; nodrop: number; reqlevel: number; damage: number; source: string | null }>`
      select id, Name as name, itemclass, itemtype, slots, classes, nodrop, reqlevel, damage, source
      from items
      where Name like ${like(filters.q)}
      order by reqlevel desc, Name asc
      limit 100
    `.execute(db!);

    return rows.rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        type: formatItemType(row.itemclass, row.itemtype, row.damage),
        slot: formatSlotMask(row.slots, row.itemclass),
        classes: decodeClassMask(row.classes),
        tradeable: Number(row.nodrop ?? 0) === 0,
        levelRequired: Number(row.reqlevel ?? 0),
        zone: row.source?.trim() || "Various"
      }))
      .filter((item) => {
        if (filters.className && !item.classes.some((klass) => includesFolded(klass, filters.className))) return false;
        if (filters.slot && !includesFolded(item.slot, filters.slot)) return false;
        if (typeof filters.tradeable === "boolean" && item.tradeable !== filters.tradeable) return false;
        return true;
      });
  }, () => summarizeItems().filter((item) => {
    if (!includesFolded(item.name, filters.q)) return false;
    if (filters.className && !item.classes.some((klass) => includesFolded(klass, filters.className))) return false;
    if (filters.slot && !includesFolded(item.slot, filters.slot)) return false;
    if (typeof filters.tradeable === "boolean" && item.tradeable !== filters.tradeable) return false;
    return true;
  }));
}

export async function getItemDetail(id: number): Promise<ItemDetail | undefined> {
  return withDatabaseFallback(async () => {
    const result = await sql<{ id: number; name: string; itemclass: number; itemtype: number; slots: number; classes: number; nodrop: number; reqlevel: number; damage: number; delay: number; lore: string | null; source: string | null; ac: number; hp: number; mana: number; astr: number; asta: number; aagi: number; adex: number; aint: number; awis: number; acha: number; mr: number; fr: number; cr: number; dr: number; pr: number; icon: number }>`
      select id, Name as name, itemclass, itemtype, slots, classes, nodrop, reqlevel, damage, delay, lore, source, ac, hp, mana,
             astr, asta, aagi, adex, aint, awis, acha, mr, fr, cr, dr, pr, icon
      from items where id = ${id}
    `.execute(db!);

    const row = result.rows[0];

    if (!row) return undefined;

    const statPairs: Array<[string, string | number | null | undefined]> = [
      ["Armor Class", row.ac],
      ["Hit Points", row.hp],
      ["Mana", row.mana],
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
      ["Damage / Delay", row.damage && row.delay ? `${row.damage} / ${row.delay}` : 0]
    ];

    const stats: Array<{ label: string; value: string }> = statPairs
      .filter(([, value]) => Number(value) !== 0)
      .map(([label, value]) => ({ label, value: String(value) }));

    const detail: ItemDetail = {
      id: row.id,
      name: row.name,
      type: formatItemType(row.itemclass, row.itemtype, row.damage),
      slot: formatSlotMask(row.slots, row.itemclass),
      classes: decodeClassMask(row.classes),
      tradeable: Number(row.nodrop ?? 0) === 0,
      levelRequired: Number(row.reqlevel ?? 0),
      zone: row.source?.trim() || "Various",
      icon: String(row.icon ?? 0),
      lore: row.lore?.trim() || "No lore text available.",
      stats,
      droppedBy: [],
      soldBy: [],
      usedInRecipes: []
    };
    return detail;
  }, () => items.find((item) => item.id === id));
}

export async function listSpells(filters: SpellFilters = {}) {
  return withDatabaseFallback(async () => {
    const rows = await sql<Record<string, unknown>>`
      select id, name, skill, effectid1, classes1, classes2, classes3, classes4, classes5, classes6, classes7, classes8,
             classes9, classes10, classes11, classes12, classes13, classes14, classes15, classes16
      from spells_new
      where name like ${like(filters.q)}
      order by name asc
      limit 100
    `.execute(db!);

    return rows.rows
      .map((row) => {
        const classes = spellClassesFromRow(row);
        return {
          id: Number(row.id),
          name: String(row.name),
          classes: classes.map((entry) => entry.klass),
          level: Math.min(...classes.map((entry) => entry.level), 255),
          skill: formatSpellSkill(Number(row.skill ?? 0)),
          effect: `Effect ${Number(row.effectid1 ?? 0)}`
        };
      })
      .filter((spell) => {
        if (filters.className && !spell.classes.some((klass) => includesFolded(klass, filters.className))) return false;
        if (filters.level && spell.level !== filters.level) return false;
        return true;
      });
  }, () => summarizeSpells().filter((spell) => {
    if (!includesFolded(spell.name, filters.q)) return false;
    if (filters.className && !spell.classes.some((klass) => includesFolded(klass, filters.className))) return false;
    if (filters.level && spell.level !== filters.level) return false;
    return true;
  }));
}

export async function getSpellDetail(id: number): Promise<SpellDetail | undefined> {
  return withDatabaseFallback(async () => {
    const result = await sql<Record<string, unknown>>`
      select id, name, skill, effectid1, mana, targettype, buffduration, resisttype, cast_on_you,
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
      classes: classes.map((entry) => entry.klass),
      level: Math.min(...classes.map((entry) => entry.level), 255),
      skill: formatSpellSkill(Number(row.skill ?? 0)),
      effect: `Effect ${Number(row.effectid1 ?? 0)}`,
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
        name: row.name,
        race: formatRace(row.race),
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
      name: row.name,
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
    const rows = await sql<{ short_name: string; long_name: string; expansion: number; min_level: number; max_level: number; note: string | null }>`
      select short_name, long_name, expansion, min_level, max_level, note
      from zone
      where short_name like ${like(filters.q)} or long_name like ${like(filters.q)}
      order by long_name asc
      limit 200
    `.execute(db!);

    return rows.rows
      .map((row) => ({
        shortName: row.short_name,
        longName: row.long_name,
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
    const result = await sql<{ short_name: string; long_name: string; expansion: number; min_level: number; max_level: number; note: string | null; safe_x: number; safe_y: number; safe_z: number }>`
      select short_name, long_name, expansion, min_level, max_level, note, safe_x, safe_y, safe_z
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
      shortName: zone.short_name,
      longName: zone.long_name,
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

export function listFactions(q?: string) {
  return summarizeFactions().filter((faction) => includesFolded(faction.name, q));
}

export function getFactionDetail(id: number): FactionDetail | undefined {
  return factions.find((faction) => faction.id === id);
}

export function listRecipes(filters: RecipeFilters = {}) {
  return summarizeRecipes().filter((recipe) => {
    if (!includesFolded(recipe.name, filters.q)) return false;
    if (filters.tradeskill && !includesFolded(recipe.tradeskill, filters.tradeskill)) return false;
    return true;
  });
}

export function getRecipeDetail(id: number): RecipeDetail | undefined {
  return recipes.find((recipe) => recipe.id === id);
}

export function listPets(q?: string) {
  return pets.filter((pet) => includesFolded(pet.name, q));
}

export function getPetDetail(id: number): PetDetail | undefined {
  return pets.find((pet) => pet.id === id);
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
