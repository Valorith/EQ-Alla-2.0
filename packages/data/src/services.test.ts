import { describe, expect, it } from "vitest";
import { sql } from "kysely";
import {
  formatPlayableItemRaceMask,
  formatZoneEra,
  getCatalogStats,
  getFactionDetail,
  getItemDetail,
  getNpcDetail,
  getPetDetail,
  getRecipeDetail,
  getSpellDetail,
  getZoneDetail,
  getZonesByEra,
  getZonesByLevel,
  itemTypeFilterOptions,
  listFactions,
  listItems,
  listNpcs,
  listPets,
  listRecipes,
  listSpells,
  listZoneEraBrowseDefinitions,
  listZoneEras,
  listZones,
  matchesZoneEraFilter,
  petSearchLevelCap,
  resolveLegacyRoute,
  searchCatalog,
  spellSearchLevelCap,
  zoneByLevelCap
} from "./index";
import { getDb } from "./db";
import { resolveSpellEffectDirection, summarizeSpellEffects } from "./spell-effects";

describe("catalog services", () => {
  it("filters items by tradeable flag", async () => {
    const tradeableItems = await listItems({ tradeable: true });
    expect(tradeableItems.every((item) => item.tradeable)).toBe(true);
  });

  it("interprets nodrop correctly for item lists and detail flags", async () => {
    const clothCap = await getItemDetail(1001);
    const prayerShawl = await getItemDetail(1175);
    const tradeableClothCaps = await listItems({ q: "Cloth Cap", tradeable: true });
    const noDropShawls = await listItems({ q: "Prayer Shawl", tradeable: false });

    expect(clothCap?.tradeable).toBe(true);
    expect(clothCap?.flags.includes("No Drop")).toBe(false);
    expect(prayerShawl?.tradeable).toBe(false);
    expect(prayerShawl?.flags.includes("No Drop")).toBe(true);
    expect(tradeableClothCaps.some((item) => item.id === 1001)).toBe(true);
    expect(noDropShawls.some((item) => item.id === 1175)).toBe(true);
  });

  it("includes grouped zone context for item drop NPCs", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ item_id: number }>`
      select distinct lde.item_id
      from lootdrop_entries lde
      join loottable_entries lte on lte.lootdrop_id = lde.lootdrop_id
      join npc_types nt on nt.loottable_id = lte.loottable_id
      join spawnentry se on se.npcID = nt.id
      join spawngroup sg on sg.id = se.spawngroupID
      join spawn2 s2 on s2.spawngroupID = sg.id
      join zone z on z.short_name = s2.zone and z.version = s2.version
      where coalesce(z.min_status, 0) = 1
        and exists (
          select 1
          from discovered_items di
          where di.item_id = lde.item_id
        )
      order by lde.item_id asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const item = await getItemDetail(rows.rows[0].item_id);

    const firstDrop = item?.droppedBy[0];
    expect(item?.droppedBy.length).toBeGreaterThan(0);
    expect(firstDrop?.zone.shortName.length).toBeGreaterThan(0);
    expect(firstDrop?.zone.longName.length).toBeGreaterThan(0);
    expect(firstDrop?.zone.href).toBe(`/zones/${firstDrop?.zone.shortName}`);
  }, 20_000);

  it("includes grouped zone context for merchant sellers on item detail", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ item_id: number }>`
      select distinct ml.item as item_id
      from merchantlist ml
      join npc_types nt on nt.merchant_id = ml.merchantid
      join spawnentry se on se.npcID = nt.id
      join spawngroup sg on sg.id = se.spawngroupID
      join spawn2 s2 on s2.spawngroupID = sg.id
      join zone z on z.short_name = s2.zone and z.version = s2.version
      where coalesce(z.min_status, 0) = 1
        and exists (
          select 1
          from discovered_items di
          where di.item_id = ml.item
        )
      order by ml.item asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const merchantItem = await getItemDetail(rows.rows[0].item_id);

    expect(merchantItem?.soldBy.length).toBeGreaterThan(0);
    const firstSeller = merchantItem?.soldBy[0];
    expect(firstSeller?.zone.shortName.length).toBeGreaterThan(0);
    expect(firstSeller?.zone.longName.length).toBeGreaterThan(0);
    expect(firstSeller?.zone.href).toBe(`/zones/${firstSeller?.zone.shortName}`);
  }, 20_000);

  it("includes merchants on item sold-by lists when their required content flag is enabled", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ item_id: number; npc_id: number }>`
      select distinct ml.item as item_id, nt.id as npc_id
      from merchantlist ml
      join npc_types nt on nt.merchant_id = ml.merchantid
      join spawnentry se on se.npcID = nt.id
      join spawngroup sg on sg.id = se.spawngroupID
      join spawn2 s2 on s2.spawngroupID = sg.id
      join zone z on z.short_name = s2.zone and z.version = s2.version
      join content_flags cf on cf.flag_name = s2.content_flags and coalesce(cf.enabled, 0) <> 0
      where coalesce(z.min_status, 0) <= ${1}
        and exists (
          select 1
          from discovered_items di
          where di.item_id = ml.item
        )
      order by ml.item asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const item = await getItemDetail(rows.rows[0].item_id);

    expect(item?.soldBy.some((entry) => entry.id === rows.rows[0].npc_id)).toBe(true);
  }, 20_000);

  it("excludes merchants from item sold-by lists when their required content flag is disabled", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ item_id: number; npc_id: number }>`
      select distinct ml.item as item_id, nt.id as npc_id
      from merchantlist ml
      join npc_types nt on nt.merchant_id = ml.merchantid
      join spawnentry se on se.npcID = nt.id
      join spawngroup sg on sg.id = se.spawngroupID
      join spawn2 s2 on s2.spawngroupID = sg.id
      join zone z on z.short_name = s2.zone and z.version = s2.version
      join content_flags cf on cf.flag_name = s2.content_flags and coalesce(cf.enabled, 0) = 0
      where coalesce(z.min_status, 0) <= ${1}
        and exists (
          select 1
          from discovered_items di
          where di.item_id = ml.item
        )
      order by ml.item asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const item = await getItemDetail(rows.rows[0].item_id);

    expect(item?.soldBy.some((entry) => entry.id === rows.rows[0].npc_id)).toBe(false);
  }, 20_000);

  it("excludes merchants from item sold-by lists when their only public spawn is disabled", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ item_id: number; npc_id: number }>`
      select distinct ml.item as item_id, nt.id as npc_id
      from merchantlist ml
      join npc_types nt on nt.merchant_id = ml.merchantid
      join spawnentry se on se.npcID = nt.id
      join spawngroup sg on sg.id = se.spawngroupID
      join spawn2 s2 on s2.spawngroupID = sg.id
      join spawn2_disabled s2d on s2d.spawn2_id = s2.id and coalesce(s2d.disabled, 0) <> 0
      join zone z on z.short_name = s2.zone and z.version = s2.version
      where coalesce(z.min_status, 0) <= ${1}
        and exists (
          select 1
          from discovered_items di
          where di.item_id = ml.item
        )
        and not exists (
          select 1
          from spawnentry se2
          join spawngroup sg2 on sg2.id = se2.spawngroupID
          join spawn2 s22 on s22.spawngroupID = sg2.id
          left join spawn2_disabled s2d2 on s2d2.spawn2_id = s22.id and coalesce(s2d2.disabled, 0) <> 0
          join zone z2 on z2.short_name = s22.zone and z2.version = s22.version
          where se2.npcID = nt.id
            and coalesce(z2.min_status, 0) <= ${1}
            and s2d2.spawn2_id is null
        )
      order by ml.item asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const item = await getItemDetail(rows.rows[0].item_id);

    expect(item?.soldBy.some((entry) => entry.id === rows.rows[0].npc_id)).toBe(false);
  }, 20_000);

  it("excludes drop NPCs from item drop lists when their only public spawn is disabled", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ item_id: number; npc_id: number }>`
      select distinct lde.item_id as item_id, nt.id as npc_id
      from lootdrop_entries lde
      join loottable_entries lte on lte.lootdrop_id = lde.lootdrop_id
      join npc_types nt on nt.loottable_id = lte.loottable_id
      join spawnentry se on se.npcID = nt.id
      join spawngroup sg on sg.id = se.spawngroupID
      join spawn2 s2 on s2.spawngroupID = sg.id
      join spawn2_disabled s2d on s2d.spawn2_id = s2.id and coalesce(s2d.disabled, 0) <> 0
      join zone z on z.short_name = s2.zone and z.version = s2.version
      where coalesce(z.min_status, 0) <= ${1}
        and exists (
          select 1
          from discovered_items di
          where di.item_id = lde.item_id
        )
        and not exists (
          select 1
          from spawnentry se2
          join spawngroup sg2 on sg2.id = se2.spawngroupID
          join spawn2 s22 on s22.spawngroupID = sg2.id
          left join spawn2_disabled s2d2 on s2d2.spawn2_id = s22.id and coalesce(s2d2.disabled, 0) <> 0
          join zone z2 on z2.short_name = s22.zone and z2.version = s22.version
          where se2.npcID = nt.id
            and coalesce(z2.min_status, 0) <= ${1}
            and s2d2.spawn2_id is null
        )
      order by lde.item_id asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const item = await getItemDetail(rows.rows[0].item_id);

    expect(item?.droppedBy.some((entry) => entry.id === rows.rows[0].npc_id)).toBe(false);
  }, 20_000);

  it("hides merchant inventory rows when the merchantlist entry is not enabled", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ npc_id: number; item_id: number }>`
      select distinct nt.id as npc_id, ml.item as item_id
      from npc_types nt
      join merchantlist ml on ml.merchantid = nt.merchant_id
      join spawnentry se on se.npcID = nt.id
      join spawngroup sg on sg.id = se.spawngroupID
      join spawn2 s2 on s2.spawngroupID = sg.id
      left join spawn2_disabled s2d on s2d.spawn2_id = s2.id and coalesce(s2d.disabled, 0) <> 0
      join zone z on z.short_name = s2.zone and z.version = s2.version
      left join content_flags required_cf on required_cf.flag_name = ml.content_flags
      left join content_flags disabled_cf on disabled_cf.flag_name = ml.content_flags_disabled
      where nt.merchant_id > 0
        and coalesce(z.min_status, 0) <= ${1}
        and s2d.spawn2_id is null
        and (
          (
            coalesce(ml.content_flags, '') <> ''
            and coalesce(required_cf.enabled, 0) = 0
          )
          or (
            coalesce(ml.content_flags_disabled, '') <> ''
            and coalesce(disabled_cf.enabled, 0) <> 0
          )
        )
        and exists (
          select 1
          from discovered_items di
          where di.item_id = ml.item
        )
        and not exists (
          select 1
          from merchantlist ml2
          left join content_flags required_cf2 on required_cf2.flag_name = ml2.content_flags
          left join content_flags disabled_cf2 on disabled_cf2.flag_name = ml2.content_flags_disabled
          where ml2.merchantid = nt.merchant_id
            and ml2.item = ml.item
            and (
              (coalesce(ml2.content_flags, '') = '' or coalesce(required_cf2.enabled, 0) <> 0)
              and (coalesce(ml2.content_flags_disabled, '') = '' or coalesce(disabled_cf2.enabled, 0) = 0)
            )
        )
      order by nt.id asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const npc = await getNpcDetail(rows.rows[0].npc_id);

    expect(npc?.sells.some((entry) => entry.id === rows.rows[0].item_id)).toBe(false);
  }, 20_000);

  it("matches canonical ingredient-only recipe usage rows", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const seedRows = await sql<{ item_id: number }>`
      select distinct tre.item_id
      from tradeskill_recipe_entries tre
      join tradeskill_recipe tr on tr.id = tre.recipe_id
      where exists (
        select 1
        from discovered_items di
        where di.item_id = tre.item_id
      )
        and coalesce(tr.enabled, 1) = 1
        and coalesce(tre.iscontainer, 0) = 0
        and coalesce(tre.successcount, 0) = 0
        and coalesce(tre.componentcount, 0) > 0
      order by tre.item_id asc
      limit 1
    `.execute(db!);

    if (!seedRows.rows[0]) {
      expect(seedRows.rows).toEqual([]);
      return;
    }

    const itemId = seedRows.rows[0].item_id;
    const expectedRows = await sql<{ id: number; name: string }>`
      select distinct tr.id, tr.name
      from tradeskill_recipe_entries tre
      join tradeskill_recipe tr on tr.id = tre.recipe_id
      where tre.item_id = ${itemId}
        and coalesce(tr.enabled, 1) = 1
        and coalesce(tre.iscontainer, 0) = 0
        and coalesce(tre.successcount, 0) = 0
        and coalesce(tre.componentcount, 0) > 0
      order by tr.name asc
    `.execute(db!);

    const item = await getItemDetail(itemId);

    expect(item?.usedInRecipes.map((entry) => entry.id)).toEqual(expectedRows.rows.map((row) => row.id));
  }, 20_000);

  it("hides disabled recipes across recipe list, search, and detail surfaces", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ id: number; name: string }>`
      select id, name
      from tradeskill_recipe
      where coalesce(enabled, 1) <> 1
      order by id asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const recipe = rows.rows[0];
    const recipes = await listRecipes({ q: recipe.name });
    const hits = await searchCatalog(recipe.name);
    const detail = await getRecipeDetail(recipe.id);

    expect(recipes.some((entry) => entry.id === recipe.id)).toBe(false);
    expect(hits.some((entry) => entry.type === "recipe" && entry.href === `/recipes/${recipe.id}`)).toBe(false);
    expect(detail).toBeUndefined();
  }, 20_000);

  it("normalizes whitespace in item search queries", async () => {
    const trimmed = await listItems({ q: "fiend" });
    const spaced = await listItems({ q: "  fiend  " });
    expect(spaced.map((item) => item.id)).toEqual(trimmed.map((item) => item.id));
  });

  it("formats item race masks using only playable races", () => {
    expect(formatPlayableItemRaceMask(1 | 4 | 8)).toBe("Human, Erudite, Wood Elf");
    expect(formatPlayableItemRaceMask(512 | 4096 | 16384)).toBe("Ogre, Iksar, Froglok");
    expect(formatPlayableItemRaceMask(65535)).toBe("ALL");
  });

  it("exposes the full EQEmu item type filter list", () => {
    expect(itemTypeFilterOptions).toContain("Crossbow");
    expect(itemTypeFilterOptions).toContain("Poison");
    expect(itemTypeFilterOptions).toContain("Placeable");
    expect(itemTypeFilterOptions).toContain("Container");
    expect(itemTypeFilterOptions).toContain("None");
  });

  it("treats items with no required level as level 1 for level filters", async () => {
    const unfiltered = await listItems();
    const minLevelOne = await listItems({ minLevel: 1 });
    const maxLevelOne = await listItems({ maxLevel: 1 });

    expect(minLevelOne.map((item) => item.id)).toEqual(unfiltered.map((item) => item.id));
    expect(maxLevelOne.length).toBeGreaterThan(1);
    expect(maxLevelOne.every((item) => item.levelRequired <= 1)).toBe(true);
  });

  it("translates non-player NPC race ids to race names", async () => {
    const skeletonPets = await listNpcs({ q: "skel_pet_1_" });
    expect(skeletonPets.some((npc) => npc.race === "Skeleton")).toBe(true);
  });

  it("excludes untrackable NPCs from NPC listings, global search, and direct detail routes", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ id: number; name: string }>`
      select nt.id, nt.name
      from npc_types nt
      where coalesce(nt.trackable, 0) <> 1
        and nt.name like '%projection%'
        and not exists (
          select 1
          from npc_types tracked
          where tracked.name = nt.name
            and coalesce(tracked.trackable, 0) = 1
        )
      order by nt.name asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const query = rows.rows[0].name;
    const npcResults = await listNpcs({ q: query });
    const searchHits = await searchCatalog(query);
    const npcDetail = await getNpcDetail(rows.rows[0].id);

    expect(npcResults.some((npc) => npc.name.replaceAll(" ", "_") === query)).toBe(false);
    expect(searchHits.some((hit) => hit.type === "npc")).toBe(false);
    expect(npcDetail).toBeUndefined();
  }, 60_000);

  it("renders readable spell effect translations for trigger focus effects", async () => {
    const spell = await getSpellDetail(38188);
    const effectTexts = spell?.effects.map((entry) => entry.text) ?? [];

    expect(effectTexts).toContain("Focus: Trigger on Cast (25% chance to cast Soul Flay Effect)");
    expect(effectTexts).toContain("Limit: Target (Life Tap)");
    expect(effectTexts).toContain("Limit: Min Level 51");
  });

  it("keeps spell effect increase/decrease direction aligned with the stored values", () => {
    expect(resolveSpellEffectDirection("Increase Hitpoints", -750)).toBe("Decrease Hitpoints");
    expect(resolveSpellEffectDirection("Increase hate", -400)).toBe("Decrease hate");
    expect(resolveSpellEffectDirection("In/Decrease Attack Speed", 85, 11)).toBe("Decrease Attack Speed");
    expect(resolveSpellEffectDirection("Increase Damage Shield", -3, 59)).toBe("Increase Damage Shield");
    expect(resolveSpellEffectDirection("Increase Player Size", 66, 89)).toBe("Decrease Player Size");
    expect(resolveSpellEffectDirection("Decrease Spell Mana Cost", 10)).toBe("Decrease Spell Mana Cost");
    expect(resolveSpellEffectDirection("In/Decrease Movement", -45)).toBe("Decrease Movement");
  });

  it("summarizes spell search effects using sign-aware labels", () => {
    const summary = summarizeSpellEffects({
      effectid1: 89,
      effect_base_value1: 66,
      effectid2: 11,
      effect_base_value2: 85,
      effectid3: 59,
      effect_base_value3: -3,
      effectid4: 132,
      effect_base_value4: 10
    });

    expect(summary).toBe("Decrease Player Size • Decrease Attack Speed • Increase Damage Shield • Decrease Spell Mana Cost");
  });

  it("renders legacy encoded percent effects the way classic Alla-style text expects", async () => {
    const shrink = await getSpellDetail(345);
    const thistlecoat = await getSpellDetail(515);
    const turgur = await getSpellDetail(1588);

    const shrinkEffects = shrink?.effects.map((entry) => entry.text) ?? [];
    const thistlecoatEffects = thistlecoat?.effects.map((entry) => entry.text) ?? [];
    const turgurEffects = turgur?.effects.map((entry) => entry.text) ?? [];

    expect(shrinkEffects).toContain("Decrease Player Size by 34%");
    expect(thistlecoatEffects).toContain("Increase Damage Shield by 1");
    expect(turgurEffects).toContain("Decrease Attack Speed by 15%");
  });

  it("caps spell search results at level 60", async () => {
    const highLevelOnly = await listSpells({ q: "Agility of the Wrulan" });
    const upperBand = await listSpells({ className: "Shaman", level: 60, levelMode: "min" });

    expect(highLevelOnly.some((spell) => spell.id === 3378)).toBe(false);
    expect(upperBand.length).toBeGreaterThan(0);
    expect(upperBand.every((spell) => spell.level <= spellSearchLevelCap)).toBe(true);
  });

  it("caps pet listings and pet detail routes at level 60", async () => {
    const magicianPets = await listPets({ className: "Magician" });
    const highLevelPet = await getPetDetail(40926);

    expect(magicianPets.length).toBeGreaterThan(0);
    expect(magicianPets.every((pet) => pet.petLevel <= petSearchLevelCap)).toBe(true);
    expect(highLevelPet).toBeUndefined();
  });

  it("excludes high-status zones from zones by level", async () => {
    const zones = await getZonesByLevel();
    expect(zones.some((zone) => zone.shortName === "poknowledge")).toBe(false);
  });

  it("caps zones by level bands and suggested ranges at level 60", async () => {
    const zones = await getZonesByLevel();

    expect(zones.length).toBeGreaterThan(0);
    expect(zones.every((zone) => zone.bands.every((band) => band.maxLevel <= zoneByLevelCap))).toBe(true);
    expect(zones.every((zone) => {
      const digits = zone.suggestedLevel.match(/\d+/g)?.map(Number) ?? [];
      return digits.every((value) => value <= zoneByLevelCap);
    })).toBe(true);
  });

  it("hides high-status zones from zone listings and detail routes", async () => {
    const zones = await listZones();
    const hiddenZone = await getZoneDetail("poknowledge");

    expect(zones.some((zone) => zone.shortName === "poknowledge")).toBe(false);
    expect(hiddenZone).toBeUndefined();
  });

  it("excludes high-status zones from catalog search results", async () => {
    const hits = await searchCatalog("knowledge");
    expect(hits.some((hit) => hit.type === "zone" && hit.href === "/zones/poknowledge")).toBe(false);
  });

  it("excludes spells above level 60 from global search results", async () => {
    const hits = await searchCatalog("Agility of the Wrulan");
    expect(hits.some((hit) => hit.type === "spell" && hit.href === "/spells/3378")).toBe(false);
  });

  it("returns populated search hits", async () => {
    const hits = await searchCatalog("mistmoore");
    expect(hits.some((hit) => hit.type === "zone")).toBe(true);
    expect(hits.some((hit) => hit.type === "npc")).toBe(true);
  }, 10_000);

  it("maps legacy item routes", () => {
    const target = resolveLegacyRoute("/", new URLSearchParams("a=item&id=1001"));
    expect(target).toBe("/items/1001");
  });

  it("lists all factions when no filters are applied", async () => {
    const factions = await listFactions();
    expect(factions.length).toBeGreaterThan(1);
  });

  it("filters factions by aligned zone", async () => {
    const allFactions = await listFactions();
    const sample = allFactions.find((entry) => entry.alignedZone !== "—");

    if (!sample) {
      const empty = await listFactions({ zone: "__no_such_zone__" });
      expect(empty).toEqual([]);
      return;
    }

    const results = await listFactions({ zone: sample.alignedZone });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((entry) => entry.id === sample.id)).toBe(true);
    expect(results.every((entry) => entry.alignedZone.toLowerCase().includes(sample.alignedZone.toLowerCase()))).toBe(true);
  }, 15_000);

  it("filters factions by NPC relationship type", async () => {
    const raised = await listFactions({ relationship: "raises" });
    const lowered = await listFactions({ relationship: "lowers" });
    const none = await listFactions({ relationship: "none" });

    expect(raised.every((entry) => entry.raisedByCount > 0)).toBe(true);
    expect(lowered.every((entry) => entry.loweredByCount > 0)).toBe(true);
    expect(none.every((entry) => entry.raisedByCount === 0 && entry.loweredByCount === 0)).toBe(true);
  }, 15_000);

  it("zeros faction relationships when their NPCs have no eligible public spawn", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ faction_id: number }>`
      select nfe.faction_id
      from npc_faction_entries nfe
      join npc_faction nf on nf.id = nfe.npc_faction_id
      join npc_types nt on nt.npc_faction_id = nf.id
      where coalesce(nt.trackable, 0) = 1
        and not exists (
          select 1
          from spawnentry se
          join spawngroup sg on sg.id = se.spawngroupID
          join spawn2 s2 on s2.spawngroupID = sg.id
          left join spawn2_disabled s2d on s2d.spawn2_id = s2.id and coalesce(s2d.disabled, 0) <> 0
          join (
            select short_name
            from zone
            where coalesce(version, 0) = 0
              and coalesce(min_status, 0) <= ${1}
            group by short_name
          ) z on z.short_name = s2.zone
          where se.npcID = nt.id
            and s2d.spawn2_id is null
            and (
              (coalesce(s2.content_flags, '') = '' or exists (
                select 1
                from content_flags cf
                where cf.flag_name = s2.content_flags
                  and coalesce(cf.enabled, 0) <> 0
              ))
              and (coalesce(s2.content_flags_disabled, '') = '' or not exists (
                select 1
                from content_flags cf
                where cf.flag_name = s2.content_flags_disabled
                  and coalesce(cf.enabled, 0) <> 0
              ))
            )
        )
      group by nfe.faction_id
      order by count(distinct nt.id) desc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const factionId = rows.rows[0].faction_id;
    const summary = (await listFactions({ q: String(factionId) })).find((entry) => entry.id === factionId);
    const detail = await getFactionDetail(factionId);

    expect(summary?.raisedByCount ?? 0).toBe(0);
    expect(summary?.loweredByCount ?? 0).toBe(0);
    expect(detail?.raisedByCount ?? 0).toBe(0);
    expect(detail?.loweredByCount ?? 0).toBe(0);
  }, 20_000);

  it("maps index.php legacy item routes", () => {
    const target = resolveLegacyRoute("/index.php", new URLSearchParams("a=item&id=1001"));
    expect(target).toBe("/items/1001");
  });

  it("falls back unknown legacy route params to the home page", () => {
    const target = resolveLegacyRoute("/", new URLSearchParams("a=totally_unknown_route"));
    expect(target).toBe("/");
  });

  it("falls back unknown php entrypoints to the home page", () => {
    const target = resolveLegacyRoute("/mystery.php", new URLSearchParams());
    expect(target).toBe("/");
  });

  it("exposes the legacy zone era list from the clone", async () => {
    const eras = await listZoneEras();
    expect(eras).toContain("Classic");
    expect(eras).toContain("Planes of Power");
    expect(eras).toContain("Veil of Alaris");
  });

  it("marks empty expansion buckets as disabled for the zones by era landing page", async () => {
    const eras = await listZoneEraBrowseDefinitions();
    const classic = eras.find((era) => era.label === "Classic");
    const power = eras.find((era) => era.label === "Planes of Power");

    expect(classic?.enabled).toBe(true);
    expect(classic?.zoneCount).toBeGreaterThan(0);
    expect(power?.enabled).toBe(false);
    expect(power?.zoneCount).toBe(0);
  });

  it("lists enabled zone expansions before disabled ones on the zones by era landing page", async () => {
    const eras = await listZoneEraBrowseDefinitions();
    const firstDisabledIndex = eras.findIndex((era) => !era.enabled);

    expect(firstDisabledIndex).toBeGreaterThan(-1);
    expect(eras.slice(0, firstDisabledIndex).every((era) => era.enabled)).toBe(true);
    expect(eras.slice(firstDisabledIndex).every((era) => !era.enabled)).toBe(true);
  });

  it("maps zone eras directly from the database expansion value", () => {
    expect(formatZoneEra("nektulos", 1)).toBe("Ruins of Kunark");
    expect(formatZoneEra("mistmoore", 1)).toBe("Ruins of Kunark");
    expect(formatZoneEra("sebilis", 1)).toBe("Ruins of Kunark");
    expect(formatZoneEra("chardok", 2)).toBe("Scars of Velious");
    expect(formatZoneEra("veksar", 2)).toBe("Scars of Velious");
  });

  it("keeps legacy classic aliases mapped to the Classic expansion filter", () => {
    expect(matchesZoneEraFilter({ shortName: "nektulos", era: "Classic" }, "Antonica")).toBe(true);
    expect(matchesZoneEraFilter({ shortName: "nektulos", era: "Classic" }, "Faydwer")).toBe(true);
    expect(matchesZoneEraFilter({ shortName: "nektulos", era: "Classic" }, "Kunark")).toBe(false);
  });

  it("resolves expansion-era filters and legacy classic aliases", async () => {
    const classicZones = await getZonesByEra("Classic");
    const antonicaAliasZones = await getZonesByEra("Antonica");

    expect(classicZones.some((zone) => zone.shortName === "mistmoore")).toBe(true);
    expect(classicZones.some((zone) => zone.shortName === "poknowledge")).toBe(false);
    expect(antonicaAliasZones.map((zone) => zone.shortName)).toEqual(classicZones.map((zone) => zone.shortName));
  });

  it("exposes stats and zone detail", async () => {
    const stats = await getCatalogStats();
    const zone = await getZoneDetail("mistmoore");
    expect(stats.items).toBeGreaterThan(0);
    expect(zone?.namedNpcs.length).toBeGreaterThan(0);
  });

  it("reports catalog stats from the same visible NPC and recipe populations used by the app", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const [expectedNpcCount, expectedRecipeCount] = await Promise.all([
      sql<{ count: number }>`
        select count(distinct nt.id) as count
        from npc_types nt
        join spawnentry se on se.npcID = nt.id
        join spawngroup sg on sg.id = se.spawngroupID
        join spawn2 s2 on s2.spawngroupID = sg.id
        left join spawn2_disabled s2d on s2d.spawn2_id = s2.id and coalesce(s2d.disabled, 0) <> 0
        join (
          select short_name
          from zone
          where coalesce(version, 0) = 0
            and coalesce(min_status, 0) <= ${1}
          group by short_name
        ) z on z.short_name = s2.zone
        where s2d.spawn2_id is null
          and coalesce(nt.trackable, 0) = 1
          and (
            (coalesce(s2.content_flags, '') = '' or exists (
              select 1
              from content_flags cf
              where cf.flag_name = s2.content_flags
                and coalesce(cf.enabled, 0) <> 0
            ))
            and (coalesce(s2.content_flags_disabled, '') = '' or not exists (
              select 1
              from content_flags cf
              where cf.flag_name = s2.content_flags_disabled
                and coalesce(cf.enabled, 0) <> 0
            ))
          )
      `.execute(db!),
      sql<{ count: number }>`
        select count(*) as count
        from tradeskill_recipe
        where coalesce(enabled, 1) = 1
      `.execute(db!)
    ]);

    const stats = await getCatalogStats();

    expect(stats.npcs).toBe(Number(expectedNpcCount.rows[0]?.count ?? 0));
    expect(stats.recipes).toBe(Number(expectedRecipeCount.rows[0]?.count ?? 0));
  }, 20_000);

  it("includes shared spawn versions in zone detail bestiary data", async () => {
    const zone = await getZoneDetail("fearplane");
    expect(zone?.bestiary.length).toBeGreaterThan(1);
    expect(zone?.bestiary.some((npc) => npc.name === "a dracoliche")).toBe(true);
  });
});
