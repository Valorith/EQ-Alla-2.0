import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sql } from "kysely";
import {
  bodyTypeNameMap,
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
import { getSpellEffectName, resolveSpellEffectDirection, summarizeSpellEffects } from "./spell-effects";

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

  it("treats items discovered only by elevated-status accounts as undiscovered", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ item_id: number; name: string }>`
      select di.item_id, i.Name as name
      from discovered_items di
      join items i on i.id = di.item_id
      group by di.item_id, i.Name
      having min(coalesce(di.account_status, 0)) > 1
      order by di.item_id asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const itemId = rows.rows[0].item_id;
    const itemName = rows.rows[0].name;
    const detail = await getItemDetail(itemId);
    const results = await listItems({ q: itemName });

    expect(detail).toBeUndefined();
    expect(results.some((item) => item.id === itemId)).toBe(false);
  });

  it("includes damage shield stats shown in-game for cloak of death", async () => {
    const item = await getItemDetail(80056);

    expect(item).toBeTruthy();
    expect(item?.stats).toContainEqual({
      label: "Damage Shield",
      value: "25",
      section: "defense"
    });
  });

  it("maps canonical item stat columns into item detail stats", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const statColumns = [
      { column: "damageshield", label: "Damage Shield" },
      { column: "shielding", label: "Shielding" },
      { column: "spellshield", label: "Spell Shield" },
      { column: "avoidance", label: "Avoidance" },
      { column: "accuracy", label: "Accuracy" },
      { column: "strikethrough", label: "Strike Through" },
      { column: "stunresist", label: "Stun Resist" },
      { column: "dotshielding", label: "DoT Shielding" },
      { column: "svcorruption", label: "Corruption Resist" },
      { column: "heroic_str", label: "Heroic Strength" },
      { column: "healamt", label: "Heal Amount" },
      { column: "spelldmg", label: "Spell Damage" },
      { column: "clairvoyance", label: "Clairvoyance" },
      { column: "backstabdmg", label: "Backstab Damage" },
      { column: "banedmgamt", label: "Bane Damage" },
      { column: "banedmgraceamt", label: "Bane Damage (Race)" },
      { column: "skillmodvalue", label: "Skill Mod" },
      { column: "bardvalue", label: "Bard Modifier" }
    ] as const;

    for (const statColumn of statColumns) {
      const sampleRows = await sql<{ id: number }>`
        select i.id
        from items i
        where exists (
          select 1
          from discovered_items di
          where di.item_id = i.id
            and coalesce(di.account_status, 0) <= 0
        )
          and coalesce(${sql.raw(statColumn.column)}, 0) <> 0
        order by i.id asc
        limit 1
      `.execute(db!);

      if (!sampleRows.rows[0]) {
        continue;
      }

      const item = await getItemDetail(sampleRows.rows[0].id);
      expect(item?.stats.some((entry) => entry.label === statColumn.label)).toBe(true);
    }
  }, 20_000);

  it("formats bane body damage with resolved body type names", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ item_id: number; banedmgbody: number; banedmgamt: number }>`
      select min(i.id) as item_id, i.banedmgbody, i.banedmgamt
      from items i
      where coalesce(i.banedmgamt, 0) <> 0
        and coalesce(i.banedmgbody, 0) > 0
        and exists (
          select 1
          from discovered_items di
          where di.item_id = i.id
            and coalesce(di.account_status, 0) <= 0
        )
      group by i.banedmgbody, i.banedmgamt
      order by i.banedmgbody asc, min(i.id) asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const row = rows.rows[0];
    const expectedBodyTypeName = bodyTypeNameMap[row.banedmgbody];

    expect(expectedBodyTypeName).toBeTruthy();

    const item = await getItemDetail(row.item_id);
    const baneDamage = item?.stats.find((entry) => entry.label === "Bane Damage");

    expect(baneDamage).toBeTruthy();
    expect(baneDamage?.value).toContain(`(${expectedBodyTypeName})`);
    expect(baneDamage?.value).not.toContain(`Body Type ${row.banedmgbody}`);
  }, 20_000);

  it("formats skill modifiers with resolved skill names", async () => {
    const item = await getItemDetail(25210);

    expect(item).toBeTruthy();
    expect(item?.stats).toContainEqual({
      label: "Skill Mod",
      value: "Taunt: +5%",
      section: "utility"
    });
  });

  it("resolves all discovered item skill modifiers to canonical EQEmu skill names", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ item_id: number; skillmodtype: number }>`
      select min(i.id) as item_id, i.skillmodtype
      from items i
      where coalesce(i.skillmodvalue, 0) <> 0
        and exists (
          select 1
          from discovered_items di
          where di.item_id = i.id
            and coalesce(di.account_status, 0) <= 0
        )
      group by i.skillmodtype
      order by i.skillmodtype asc
    `.execute(db!);

    expect(rows.rows.length).toBeGreaterThan(0);

    for (const row of rows.rows) {
      const item = await getItemDetail(row.item_id);
      const skillMod = item?.stats.find((entry) => entry.label === "Skill Mod");

      expect(skillMod).toBeTruthy();
      expect(skillMod?.value).not.toMatch(/^Skill \d+:/);
    }
  }, 20_000);

  it("formats extra damage with the correct weapon skill label", async () => {
    const item = await getItemDetail(25210);

    expect(item).toBeTruthy();
    expect(item?.stats).toContainEqual({
      label: "1HS Damage",
      value: "+5",
      section: "offense"
    });
  });

  it("formats non-weapon extra damage skills without exposing raw ids", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ item_id: number; extradmgskill: number; extradmgamt: number }>`
      select min(i.id) as item_id, i.extradmgskill, i.extradmgamt
      from items i
      where coalesce(i.extradmgamt, 0) <> 0
        and coalesce(i.extradmgskill, 0) not in (0, 1, 2, 3, 4, 5, 35, 36, 42, 43)
        and exists (
          select 1
          from discovered_items di
          where di.item_id = i.id
            and coalesce(di.account_status, 0) <= 0
        )
      group by i.extradmgskill, i.extradmgamt
      order by i.extradmgskill asc, min(i.id) asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const row = rows.rows[0];
    const item = await getItemDetail(row.item_id);
    const extraDamage = item?.stats.find(
      (entry) => entry.section === "offense" && entry.value === `+${Number(row.extradmgamt ?? 0)}` && entry.label.endsWith(" Damage")
    );

    expect(extraDamage).toBeTruthy();
    expect(extraDamage?.label).not.toBe(`Skill ${row.extradmgskill} Damage`);
  }, 20_000);

  it("formats bard modifiers with instrument names instead of type ids", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const bardSkillNames: Record<number, string> = {
      23: "Woodwind",
      24: "Strings",
      25: "Brass",
      26: "Percussion",
      50: "Singing",
      51: "All Instruments"
    };

    const rows = await sql<{ item_id: number; bardtype: number }>`
      select min(i.id) as item_id, i.bardtype
      from items i
      where coalesce(i.bardvalue, 0) <> 0
        and i.bardtype in (23, 24, 25, 26, 50, 51)
        and exists (
          select 1
          from discovered_items di
          where di.item_id = i.id
            and coalesce(di.account_status, 0) <= 0
        )
      group by i.bardtype
      order by i.bardtype asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const row = rows.rows[0];
    const item = await getItemDetail(row.item_id);
    const bardModifier = item?.stats.find((entry) => entry.label === "Bard Modifier");

    expect(bardModifier).toBeTruthy();
    expect(bardModifier?.value).toContain(bardSkillNames[row.bardtype]);
    expect(bardModifier?.value).not.toContain(`Type ${row.bardtype}`);
  }, 20_000);

  it("applies manual NPC zone overrides outside the content database", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const sampleRows = await sql<{ npc_id: number; item_id: number }>`
      select nt.id as npc_id, lde.item_id
      from npc_types nt
      join spawnentry se on se.npcID = nt.id
      join spawngroup sg on sg.id = se.spawngroupID
      join spawn2 s2 on s2.spawngroupID = sg.id
      left join spawn2_disabled s2d
        on s2d.spawn2_id = s2.id
       and coalesce(s2d.disabled, 0) <> 0
      join zone z
        on z.short_name = s2.zone
       and coalesce(z.version, 0) = 0
       and coalesce(z.min_status, 0) <= 1
      join loottable_entries lte on lte.loottable_id = nt.loottable_id
      join lootdrop_entries lde on lde.lootdrop_id = lte.lootdrop_id
      where ${sql.raw("coalesce(nt.trackable, 0) = 1")}
        and lower(trim(coalesce(nt.name, ''))) <> 'bazaar'
        and s2d.spawn2_id is null
        and exists (
          select 1
          from discovered_items di
          where di.item_id = lde.item_id
            and coalesce(di.account_status, 0) <= 0
        )
      order by nt.level desc, nt.name asc, lde.item_id asc
      limit 25
    `.execute(db!);

    if (!sampleRows.rows[0]) {
      expect(sampleRows.rows).toEqual([]);
      return;
    }

    let sample: { npc_id: number; item_id: number } | undefined;

    for (const candidate of sampleRows.rows) {
      const item = await getItemDetail(candidate.item_id);
      if (item?.droppedBy.some((entry) => entry.id === candidate.npc_id)) {
        sample = candidate;
        break;
      }
    }

    expect(sample).toBeTruthy();
    if (!sample) {
      return;
    }

    const existingNpc = await getNpcDetail(sample.npc_id);
    expect(existingNpc).toBeTruthy();

    const existingZoneShortNames = existingNpc?.spawnZones.map((zone) => zone.shortName) ?? [];
    const zoneRows = existingZoneShortNames.length > 0
      ? await sql<{ short_name: string; long_name: string }>`
          select short_name, long_name
          from zone
          where coalesce(version, 0) = 0
            and coalesce(min_status, 0) <= 1
            and short_name not in (${sql.join(existingZoneShortNames.map((value) => sql`${value}`), sql`, `)})
          order by long_name asc
          limit 1
        `.execute(db!)
      : await sql<{ short_name: string; long_name: string }>`
          select short_name, long_name
          from zone
          where coalesce(version, 0) = 0
            and coalesce(min_status, 0) <= 1
          order by long_name asc
          limit 1
        `.execute(db!);

    if (!zoneRows.rows[0]) {
      expect(zoneRows.rows).toEqual([]);
      return;
    }

    const overrideZone = zoneRows.rows[0];
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "eq-alla-manual-zones-"));
    const overridePath = path.join(tempDir, "manual-npc-zone-overrides.json");
    const previousOverridePath = process.env.EQ_MANUAL_NPC_ZONE_OVERRIDES_PATH;

    fs.writeFileSync(
      overridePath,
      JSON.stringify([{ npcId: sample.npc_id, zoneShortName: overrideZone.short_name }], null, 2),
      "utf8"
    );

    process.env.EQ_MANUAL_NPC_ZONE_OVERRIDES_PATH = overridePath;

    try {
      const npc = await getNpcDetail(sample.npc_id);
      const item = await getItemDetail(sample.item_id);
      const zone = await getZoneDetail(overrideZone.short_name);

      expect(npc?.spawnZones.some((entry) => entry.shortName === overrideZone.short_name)).toBe(true);
      expect(npc?.zone.includes(overrideZone.long_name)).toBe(true);
      expect(item?.droppedBy.some((entry) => entry.id === sample.npc_id && entry.zone.shortName === overrideZone.short_name)).toBe(true);
      expect(item?.droppedInZones.some((entry) => entry.shortName === overrideZone.short_name)).toBe(true);
      expect(zone?.bestiary.some((entry) => entry.id === sample.npc_id)).toBe(true);
      expect(zone?.itemDrops.some((entry) => entry.id === sample.item_id)).toBe(true);
    } finally {
      if (previousOverridePath === undefined) {
        delete process.env.EQ_MANUAL_NPC_ZONE_OVERRIDES_PATH;
      } else {
        process.env.EQ_MANUAL_NPC_ZONE_OVERRIDES_PATH = previousOverridePath;
      }

      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, 20_000);

  it("excludes NPCs from search and browse results when they only spawn in non-base zone versions unless overridden", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const candidateRows = await sql<{ npc_id: number; name: string; zone_short_name: string; zone_long_name: string }>`
      select nt.id as npc_id, nt.name, min(z.short_name) as zone_short_name, min(z.long_name) as zone_long_name
      from npc_types nt
      join spawnentry se on se.npcID = nt.id
      join spawngroup sg on sg.id = se.spawngroupID
      join spawn2 s2 on s2.spawngroupID = sg.id
      left join spawn2_disabled s2d on s2d.spawn2_id = s2.id and coalesce(s2d.disabled, 0) <> 0
      join zone z on z.short_name = s2.zone and z.version = 0
      where coalesce(z.min_status, 0) <= 1
        and coalesce(nt.trackable, 0) = 1
        and lower(trim(coalesce(nt.name, ''))) <> 'bazaar'
        and s2d.spawn2_id is null
        and coalesce(s2.version, 0) not in (0, -1)
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
        and not exists (
          select 1
          from spawnentry se2
          join spawngroup sg2 on sg2.id = se2.spawngroupID
          join spawn2 s22 on s22.spawngroupID = sg2.id
          left join spawn2_disabled s2d2 on s2d2.spawn2_id = s22.id and coalesce(s2d2.disabled, 0) <> 0
          join zone z2 on z2.short_name = s22.zone and z2.version = 0
          where se2.npcID = nt.id
            and coalesce(z2.min_status, 0) <= 1
            and s2d2.spawn2_id is null
            and coalesce(s22.version, 0) in (0, -1)
            and (
              (coalesce(s22.content_flags, '') = '' or exists (
                select 1
                from content_flags cf
                where cf.flag_name = s22.content_flags
                  and coalesce(cf.enabled, 0) <> 0
              ))
              and (coalesce(s22.content_flags_disabled, '') = '' or not exists (
                select 1
                from content_flags cf
                where cf.flag_name = s22.content_flags_disabled
                  and coalesce(cf.enabled, 0) <> 0
              ))
            )
        )
      group by nt.id, nt.name
      order by nt.id asc
      limit 25
    `.execute(db!);

    let sample:
      | { npc_id: number; name: string; zone_short_name: string; zone_long_name: string }
      | undefined;

    for (const candidate of candidateRows.rows) {
      const [searchResults, npcResults] = await Promise.all([
        searchCatalog(candidate.name),
        listNpcs({ q: candidate.name })
      ]);

      if (
        !searchResults.some((entry) => entry.type === "npc" && entry.id === String(candidate.npc_id)) &&
        !npcResults.some((entry) => entry.id === candidate.npc_id)
      ) {
        sample = candidate;
        break;
      }
    }

    expect(sample).toBeTruthy();
    if (!sample) {
      return;
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "eq-alla-base-version-override-"));
    const overridePath = path.join(tempDir, "manual-npc-zone-overrides.json");
    const previousOverridePath = process.env.EQ_MANUAL_NPC_ZONE_OVERRIDES_PATH;

    fs.writeFileSync(
      overridePath,
      JSON.stringify([{ npcId: sample.npc_id, zoneShortName: sample.zone_short_name }], null, 2),
      "utf8"
    );

    process.env.EQ_MANUAL_NPC_ZONE_OVERRIDES_PATH = overridePath;

    try {
      const npcs = await listNpcs({ q: sample.name });
      expect(
        npcs.some((entry) => entry.id === sample.npc_id && entry.zone.includes(sample.zone_long_name))
      ).toBe(true);
    } finally {
      if (previousOverridePath === undefined) {
        delete process.env.EQ_MANUAL_NPC_ZONE_OVERRIDES_PATH;
      } else {
        process.env.EQ_MANUAL_NPC_ZONE_OVERRIDES_PATH = previousOverridePath;
      }

      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, 20_000);

  it("matches NPC catalog search against normalized display names", async () => {
    const results = await searchCatalog("The Avatar of War");
    const npcs = await listNpcs({ q: "The Avatar of War" });

    expect(results.some((entry) => entry.type === "npc" && entry.id === "113457")).toBe(true);
    expect(npcs.some((entry) => entry.id === 113457)).toBe(true);
  });

  it("attributes mapped loot chest drops to the source NPC outside the content database", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const chestRows = await sql<{ npc_id: number; item_id: number }>`
      select nt.id as npc_id, lde.item_id
      from npc_types nt
      join loottable_entries lte on lte.loottable_id = nt.loottable_id
      join lootdrop_entries lde on lde.lootdrop_id = lte.lootdrop_id
      where exists (
        select 1
        from discovered_items di
        where di.item_id = lde.item_id
          and coalesce(di.account_status, 0) <= 0
      )
      order by nt.id asc, lde.item_id asc
      limit 25
    `.execute(db!);

    const sourceRows = await sql<{ npc_id: number; short_name: string; long_name: string }>`
      select nt.id as npc_id, min(z.short_name) as short_name, min(z.long_name) as long_name
      from npc_types nt
      join spawnentry se on se.npcID = nt.id
      join spawngroup sg on sg.id = se.spawngroupID
      join spawn2 s2 on s2.spawngroupID = sg.id
      left join spawn2_disabled s2d
        on s2d.spawn2_id = s2.id
       and coalesce(s2d.disabled, 0) <> 0
      join zone z
        on z.short_name = s2.zone
       and coalesce(z.version, 0) = 0
       and coalesce(z.min_status, 0) <= 1
      where ${sql.raw("coalesce(nt.trackable, 0) = 1")}
        and lower(trim(coalesce(nt.name, ''))) <> 'bazaar'
        and s2d.spawn2_id is null
      group by nt.id
      order by nt.level desc, nt.name asc
      limit 25
    `.execute(db!);

    let sample:
      | {
          chestNpcId: number;
          sourceNpcId: number;
          itemId: number;
          sourceZoneShortName: string;
          sourceZoneLongName: string;
        }
      | undefined;

    for (const source of sourceRows.rows) {
      const sourceDetail = await getNpcDetail(source.npc_id);
      const existingItemIds = new Set(
        sourceDetail?.drops.flatMap((group) => group.items.map((item) => item.id)) ?? []
      );

      for (const chest of chestRows.rows) {
        if (chest.npc_id === source.npc_id || existingItemIds.has(chest.item_id)) {
          continue;
        }

        const itemDetail = await getItemDetail(chest.item_id);
        if (!itemDetail?.droppedBy.some((entry) => entry.id === chest.npc_id)) {
          continue;
        }

        if (itemDetail.droppedBy.some((entry) => entry.id === source.npc_id)) {
          continue;
        }

        sample = {
          chestNpcId: chest.npc_id,
          sourceNpcId: source.npc_id,
          itemId: chest.item_id,
          sourceZoneShortName: source.short_name,
          sourceZoneLongName: source.long_name
        };
        break;
      }

      if (sample) {
        break;
      }
    }

    expect(sample).toBeTruthy();
    if (!sample) {
      return;
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "eq-alla-loot-chest-attribution-"));
    const attributionPath = path.join(tempDir, "loot-chest-npc-attribution.json");
    const previousAttributionPath = process.env.EQ_LOOT_CHEST_NPC_ATTRIBUTION_PATH;

    fs.writeFileSync(
      attributionPath,
      JSON.stringify([{ chestNpcId: sample.chestNpcId, sourceNpcId: sample.sourceNpcId }], null, 2),
      "utf8"
    );

    process.env.EQ_LOOT_CHEST_NPC_ATTRIBUTION_PATH = attributionPath;

    try {
      const item = await getItemDetail(sample.itemId);
      const sourceNpc = await getNpcDetail(sample.sourceNpcId);
      const zone = await getZoneDetail(sample.sourceZoneShortName);

      expect(item?.droppedBy.some((entry) => entry.id === sample.sourceNpcId)).toBe(true);
      expect(item?.droppedBy.some((entry) => entry.id === sample.chestNpcId)).toBe(false);
      expect(item?.droppedInZones.some((entry) => entry.shortName === sample.sourceZoneShortName)).toBe(true);
      expect(sourceNpc?.drops.some((group) => group.items.some((entry) => entry.id === sample.itemId))).toBe(true);
      expect(zone?.itemDrops.some((entry) => entry.id === sample.itemId)).toBe(true);
      expect(sourceNpc?.zone.includes(sample.sourceZoneLongName)).toBe(true);
    } finally {
      if (previousAttributionPath === undefined) {
        delete process.env.EQ_LOOT_CHEST_NPC_ATTRIBUTION_PATH;
      } else {
        process.env.EQ_LOOT_CHEST_NPC_ATTRIBUTION_PATH = previousAttributionPath;
      }

      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, 20_000);

  it("keeps undiscovered chest-attributed items hidden across user-facing surfaces", async () => {
    const npc = await getNpcDetail(92110);
    const item = await getItemDetail(150873);
    const searchResults = await searchCatalog("Essence of Yragbor");
    const items = await listItems({ q: "Essence of Yragbor" });
    const zone = await getZoneDetail("eastwastes");

    expect(npc).toBeTruthy();
    expect(npc?.drops.some((group) => group.items.some((entry) => entry.id === 150873))).toBe(false);

    expect(item).toBeUndefined();
    expect(searchResults.some((entry) => entry.type === "item" && entry.id === "150873")).toBe(false);
    expect(items.some((entry) => entry.id === 150873)).toBe(false);
    expect(zone?.itemDrops.some((entry) => entry.id === 150873)).toBe(false);
  });

  it("uses mapped chest-attribution zones on item and NPC pages", async () => {
    const item = await getItemDetail(150359);
    const npc = await getNpcDetail(364025);
    const npcList = await listNpcs({ q: "Braag the Morphling" });
    const zone = await getZoneDetail("shadowspine");

    expect(item).toBeTruthy();
    expect(item?.droppedBy.some((entry) => entry.id === 364025)).toBe(true);
    expect(item?.droppedBy.find((entry) => entry.id === 364025)?.zone.shortName).toBe("shadowspine");
    expect(item?.droppedBy.find((entry) => entry.id === 364025)?.zone.longName).toBe("Shadow Spine");
    expect(npc?.zone.includes("Shadow Spine")).toBe(true);
    expect(npc?.spawnZones.some((entry) => entry.shortName === "shadowspine")).toBe(true);
    expect(npcList.some((entry) => entry.id === 364025 && entry.zone.includes("Shadow Spine"))).toBe(true);
    expect(zone?.bestiary.some((entry) => entry.id === 364025)).toBe(true);
  });

  it("marks items sourced from the global loot table as global drops", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ item_id: number }>`
      select distinct lde.item_id as item_id
      from global_loot gl
      join loottable_entries lte on lte.loottable_id = gl.loottable_id
      join lootdrop_entries lde on lde.lootdrop_id = lte.lootdrop_id
      where coalesce(gl.enabled, 1) = 1
        and exists (
          select 1
          from discovered_items di
          where di.item_id = lde.item_id
            and coalesce(di.account_status, 0) <= 0
        )
      order by lde.item_id asc
      limit 50
    `.execute(db!);

    expect(rows.rows.length).toBeGreaterThan(0);

    let sample:
      | {
          itemId: number;
          hasOnlyGlobalSources: boolean;
        }
      | undefined;

    for (const row of rows.rows) {
      const item = await getItemDetail(row.item_id);
      if (!item?.globalDrop) {
        continue;
      }

      if (item.droppedBy.length === 0 && item.droppedInZones.length === 0) {
        sample = {
          itemId: row.item_id,
          hasOnlyGlobalSources: true
        };
        break;
      }

      if (!sample) {
        sample = {
          itemId: row.item_id,
          hasOnlyGlobalSources: false
        };
      }
    }

    expect(sample).toBeTruthy();
    if (!sample) {
      return;
    }

    const item = await getItemDetail(sample.itemId);
    expect(item?.globalDrop).toBe(true);

    if (sample.hasOnlyGlobalSources) {
      expect(item?.droppedBy).toEqual([]);
      expect(item?.droppedInZones).toEqual([]);
    }
  }, 20_000);

  it("formats elemental damage with a typed damage label", async () => {
    const item = await getItemDetail(25210);

    expect(item).toBeTruthy();
    expect(item?.stats).toContainEqual({
      label: "Fire Dmg",
      value: "1",
      section: "offense"
    });
  });

  it("supports multi-select class and slot filters for item lists", async () => {
    const filtered = await listItems({
      classNames: ["Warrior", "Paladin"],
      slots: ["Wrist", "Primary"]
    });

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.some((item) => item.classes.includes("All") && item.slot.includes("Wrist"))).toBe(true);
    expect(
      filtered.some(
        (item) =>
          item.slot.includes("Primary") &&
          (item.classes.includes("Warrior") || item.classes.includes("Paladin"))
      )
    ).toBe(true);
    expect(
      filtered.every((item) => {
        const classMatch =
          item.classes.includes("All") ||
          item.classes.includes("Warrior") ||
          item.classes.includes("Paladin");
        const slotMatch = item.slot.includes("Wrist") || item.slot.includes("Primary");

        return classMatch && slotMatch;
      })
    ).toBe(true);
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
            and coalesce(di.account_status, 0) <= 0
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

  it("includes per-npc drop chance and multiplier for item detail drops", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{
      item_id: number;
      npc_id: number;
      probability: number;
      multiplier: number;
      chance: number;
      short_name: string;
    }>`
      select lde.item_id,
             nt.id as npc_id,
             lte.probability,
             lte.multiplier,
             lde.chance,
             z.short_name
      from lootdrop_entries lde
      join loottable_entries lte on lte.lootdrop_id = lde.lootdrop_id
      join npc_types nt on nt.loottable_id = lte.loottable_id
      join spawnentry se on se.npcID = nt.id
      join spawngroup sg on sg.id = se.spawngroupID
      join spawn2 s2 on s2.spawngroupID = sg.id
      join zone z on z.short_name = s2.zone and z.version = s2.version
      where coalesce(z.min_status, 0) = 1
        and coalesce(nt.trackable, 0) = 1
        and nt.class not in (40, 41, 59, 61, 67, 68, 70)
        and nt.race not in (127, 240)
        and exists (
          select 1
          from discovered_items di
          where di.item_id = lde.item_id
            and coalesce(di.account_status, 0) <= 0
        )
      order by lde.item_id asc, z.long_name asc, nt.name asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const sample = rows.rows[0];
    const item = await getItemDetail(sample.item_id);
    const matchingDrop = item?.droppedBy.find(
      (entry) => entry.id === sample.npc_id && entry.zone.shortName === sample.short_name
    );

    expect(matchingDrop).toBeTruthy();
    expect(matchingDrop?.multiplier).toBe(Number(sample.multiplier ?? 1));
    expect(matchingDrop?.dropChance).toBeCloseTo((Number(sample.chance ?? 0) * Number(sample.probability ?? 0)) / 100, 6);
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
            and coalesce(di.account_status, 0) <= 0
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
            and coalesce(di.account_status, 0) <= 0
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
            and coalesce(di.account_status, 0) <= 0
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
            and coalesce(di.account_status, 0) <= 0
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
            and coalesce(di.account_status, 0) <= 0
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
            and coalesce(di.account_status, 0) <= 0
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

  it("includes enabled merchant inventory rows even when the item is not discovered", async () => {
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
      join zone z on z.short_name = s2.zone and coalesce(z.version, 0) = coalesce(s2.version, 0)
      left join content_flags required_cf on required_cf.flag_name = ml.content_flags
      left join content_flags disabled_cf on disabled_cf.flag_name = ml.content_flags_disabled
      where nt.merchant_id > 0
        and coalesce(nt.trackable, 0) = ${1}
        and lower(trim(coalesce(nt.name, ''))) <> 'bazaar'
        and s2d.spawn2_id is null
        and coalesce(s2.version, 0) in (0, -1)
        and coalesce(z.min_status, 0) <= ${1}
        and coalesce(z.version, 0) = 0
        and (coalesce(s2.content_flags, '') = '' or exists (
          select 1
          from content_flags spawn_required_cf
          where spawn_required_cf.flag_name = s2.content_flags
            and coalesce(spawn_required_cf.enabled, 0) <> 0
        ))
        and (coalesce(s2.content_flags_disabled, '') = '' or not exists (
          select 1
          from content_flags spawn_disabled_cf
          where spawn_disabled_cf.flag_name = s2.content_flags_disabled
            and coalesce(spawn_disabled_cf.enabled, 0) <> 0
        ))
        and coalesce(ml.min_status, 0) <= ${1}
        and (coalesce(ml.content_flags, '') = '' or coalesce(required_cf.enabled, 0) <> 0)
        and (coalesce(ml.content_flags_disabled, '') = '' or coalesce(disabled_cf.enabled, 0) = 0)
        and not exists (
          select 1
          from discovered_items di
          where di.item_id = ml.item
            and coalesce(di.account_status, 0) <= 0
        )
      order by nt.id asc, ml.item asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const npc = await getNpcDetail(rows.rows[0].npc_id);
    const sellEntry = npc?.sells.find((entry) => entry.id === rows.rows[0].item_id);

    expect(sellEntry).toBeTruthy();
    expect(sellEntry?.href).toBeUndefined();
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
          and coalesce(di.account_status, 0) <= 0
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

    expect(item?.usedInRecipes.filter((entry) => entry.href.startsWith("/recipes/")).map((entry) => entry.id)).toEqual(
      expectedRows.rows.map((row) => row.id)
    );
  }, 20_000);

  it("includes Victoria crafted spell outputs in used in recipes for spell items", async () => {
    const item = await getItemDetail(150456);

    expect(item).toBeTruthy();
    expect(item?.usedInRecipes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: expect.stringContaining("Victoria:"),
          href: expect.stringContaining("/crafted-spells?q=")
        })
      ])
    );
    expect(item?.usedInRecipes.some((entry) => entry.href.includes("&recipe="))).toBe(true);
  }, 20_000);

  it("includes Victoria crafted spell inputs in used in recipes for component ledger items", async () => {
    const item = await getItemDetail(150248);

    expect(item).toBeTruthy();
    expect(item?.usedInRecipes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: expect.stringContaining("Victoria:"),
          href: expect.stringContaining("/crafted-spells?q=")
        })
      ])
    );
    expect(item?.usedInRecipes.some((entry) => entry.href.includes("&recipe="))).toBe(true);
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
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ name: string }>`
      select nt.name
      from npc_types nt
      join spawnentry se on se.npcID = nt.id
      join spawngroup sg on sg.id = se.spawngroupID
      join spawn2 s2 on s2.spawngroupID = sg.id
      left join spawn2_disabled s2d on s2d.spawn2_id = s2.id and coalesce(s2d.disabled, 0) <> 0
      join zone z on z.short_name = s2.zone and z.version = 0
      where coalesce(z.min_status, 0) <= 1
        and coalesce(nt.trackable, 0) = 1
        and lower(trim(coalesce(nt.name, ''))) <> 'bazaar'
        and nt.race = 60
        and s2d.spawn2_id is null
        and coalesce(s2.version, 0) in (0, -1)
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
      order by nt.id asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const skeletonNpcs = await listNpcs({ q: rows.rows[0].name });
    expect(skeletonNpcs.some((npc) => npc.race === "Skeleton")).toBe(true);
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

  it("excludes NPCs named Bazaar from listings, search, detail, and zone bestiary views", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ id: number; zone: string }>`
      select nt.id, min(s2.zone) as zone
      from npc_types nt
      join spawnentry se on se.npcID = nt.id
      join spawngroup sg on sg.id = se.spawngroupID
      join spawn2 s2 on s2.spawngroupID = sg.id
      where nt.name = 'Bazaar'
      group by nt.id
      order by nt.id asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const sample = rows.rows[0];
    const npcResults = await listNpcs({ q: "Bazaar" });
    const searchHits = await searchCatalog("Bazaar");
    const npcDetail = await getNpcDetail(sample.id);
    const zoneDetail = await getZoneDetail(sample.zone);

    expect(npcResults.some((npc) => npc.name === "Bazaar")).toBe(false);
    expect(searchHits.some((hit) => hit.type === "npc" && hit.title === "Bazaar")).toBe(false);
    expect(npcDetail).toBeUndefined();
    expect(zoneDetail?.bestiary.some((npc) => npc.name === "Bazaar")).toBe(false);
  }, 20_000);

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

  it("formats EQEmu-specific AE melee spell effects with a translated label", async () => {
    const spell = await getSpellDetail(38106);
    const effects = spell?.effects.map((entry) => entry.text) ?? [];

    expect(effects).toContain("AE Melee for 1 min");
    expect(effects.some((entry) => entry.includes("Effect 211"))).toBe(false);
  });

  it("uses the Spire SPA fallback names for unmapped spell effects", () => {
    expect(getSpellEffectName(193)).toBe("Skill Attack");
    expect(getSpellEffectName(220)).toBe("Skill Damage Bonus");
    expect(getSpellEffectName(262)).toBe("Raise Stat Cap");
  });

  it("deduplicates repeated spell effect slots and renders skill attacks with translated skill names", async () => {
    const spell = await getSpellDetail(42606);
    const skillAttack = spell?.effects.find((entry) => entry.text.includes("Attack")) ?? null;

    expect(spell?.skill).toBe("Throwing");
    expect(skillAttack).toEqual({
      slots: [1, 2, 3, 4],
      text: "Throwing Attack for 26 with 100% Accuracy Mod"
    });
    expect(spell?.effects.some((entry) => entry.text.includes("Effect 193"))).toBe(false);
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
            and coalesce(s2.version, 0) in (0, -1)
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

  it("lists only min_status 0 zones for recipe public station access", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const rows = await sql<{ recipe_id: number }>`
      select distinct r.id as recipe_id
      from tradeskill_recipe r
      join tradeskill_recipe_entries tre on tre.recipe_id = r.id and tre.iscontainer = 1
      left join items i on i.id = tre.item_id
      where coalesce(r.enabled, 1) = 1
        and (
          coalesce(i.Name, '') like '%Forge%'
          or coalesce(i.Name, '') like '%Sewing%'
          or coalesce(i.Name, '') like '%Loom%'
          or coalesce(i.Name, '') like '%Oven%'
          or coalesce(i.Name, '') like '%Spit%'
          or coalesce(i.Name, '') like '%Mixing Bowl%'
          or coalesce(i.Name, '') like '%Brew%'
          or coalesce(i.Name, '') like '%Barrel%'
          or coalesce(i.Name, '') like '%Fletching%'
          or coalesce(i.Name, '') like '%Jeweler%'
          or coalesce(i.Name, '') like '%Kiln%'
          or coalesce(i.Name, '') like '%Pottery Wheel%'
        )
      order by r.id asc
      limit 1
    `.execute(db!);

    if (!rows.rows[0]) {
      expect(rows.rows).toEqual([]);
      return;
    }

    const recipe = await getRecipeDetail(rows.rows[0].recipe_id);
    expect(recipe).toBeTruthy();
    expect(recipe?.requiredStations.length).toBeGreaterThan(0);
    expect(recipe?.availableZonesByStation.length).toBeGreaterThan(0);

    const zoneShortNames = recipe?.availableZonesByStation.flatMap((station) => station.zones.map((zone) => zone.shortName)) ?? [];

    if (zoneShortNames.length === 0) {
      expect(recipe?.availableZonesByStation.every((station) => station.zones.length === 0)).toBe(true);
      return;
    }

    const publicZoneRows = await sql<{ short_name: string; min_status: number }>`
      select short_name, min_status
      from zone
      where version = 0
        and short_name in (${sql.join(zoneShortNames.map((shortName) => sql`${shortName}`), sql`, `)})
    `.execute(db!);

    expect(publicZoneRows.rows.every((row) => Number(row.min_status ?? 0) === 0)).toBe(true);
  }, 20_000);

  it("includes normalized crafting services on visible zone detail routes", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const sampleRows = await sql<{ short_name: string; station_count: number }>`
      select z.short_name, count(*) as station_count
      from zone z
      join object o on o.zoneid = z.zoneidnumber
      where z.version = 0
        and coalesce(z.min_status, 0) <= ${1}
        and o.version in (z.version, -1)
        and (
          (
            coalesce(o.content_flags, '') = ''
            or exists (
              select 1
              from content_flags cf
              where cf.flag_name = o.content_flags
                and coalesce(cf.enabled, 0) <> 0
            )
          )
          and (
            coalesce(o.content_flags_disabled, '') = ''
            or not exists (
              select 1
              from content_flags cf
              where cf.flag_name = o.content_flags_disabled
                and coalesce(cf.enabled, 0) <> 0
            )
          )
        )
        and o.type in (9,10,11,12,13,14,15,16,17,18,19,20,21,22,24,30,31,32,33,34,35,36,38,39,40,41,42,43,44,45,46,47,48,49,50)
      group by z.short_name
      order by station_count desc, z.short_name asc
      limit 1
    `.execute(db!);

    if (!sampleRows.rows[0]) {
      expect(sampleRows.rows).toEqual([]);
      return;
    }

    const sample = sampleRows.rows[0];
    const zone = await getZoneDetail(sample.short_name);

    expect(zone).toBeTruthy();
    expect(zone?.craftingStations).toBe(Number(sample.station_count ?? 0));
    expect(zone?.craftingServices.length).toBeGreaterThan(0);
    expect(zone?.craftingServices.reduce((sum, service) => sum + service.count, 0)).toBe(Number(sample.station_count ?? 0));
  }, 20_000);

  it("falls back to alternate object versions for public guild hall crafting stations", async () => {
    const zone = await getZoneDetail("guildhall");

    expect(zone).toBeTruthy();
    expect(zone?.craftingStations).toBeGreaterThan(0);
    expect(zone?.craftingServices.some((service) => service.slug === "blacksmithing")).toBe(true);
    expect(zone?.craftingServices.some((service) => service.slug === "baking")).toBe(true);
    expect(zone?.craftingServices.some((service) => service.slug === "pottery-wheel")).toBe(true);
    expect(zone?.craftingServices.some((service) => service.slug === "pottery-kiln")).toBe(true);
  }, 20_000);

  it("limits zone notable NPCs to entries with an active public spawn chance", async () => {
    const db = getDb();
    expect(db).toBeTruthy();

    const zone = await getZoneDetail("mistmoore");
    expect(zone).toBeTruthy();
    expect(zone?.namedNpcs.length).toBeGreaterThan(0);

    const namedNpcIds = zone?.namedNpcs.map((entry) => entry.id) ?? [];

    const rows = await sql<{ id: number; active_spawn_count: number }>`
      select nt.id, count(*) as active_spawn_count
      from npc_types nt
      join spawnentry se on se.npcID = nt.id
      join spawngroup sg on sg.id = se.spawngroupID
      join spawn2 s2 on s2.spawngroupID = sg.id
      left join spawn2_disabled s2d on s2d.spawn2_id = s2.id and coalesce(s2d.disabled, 0) <> 0
      join zone z on z.short_name = s2.zone and z.version = 0
      where nt.id in (${sql.join(namedNpcIds.map((id) => sql`${id}`), sql`, `)})
        and s2.version in (z.version, -1)
        and s2d.spawn2_id is null
        and coalesce(se.chance, 0) > 0
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
      group by nt.id
    `.execute(db!);

    expect(rows.rows.length).toBe(namedNpcIds.length);
    expect(rows.rows.every((row) => Number(row.active_spawn_count ?? 0) > 0)).toBe(true);
  }, 20_000);

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
          and coalesce(s2.version, 0) in (0, -1)
          and coalesce(nt.trackable, 0) = 1
          and lower(trim(coalesce(nt.name, ''))) <> 'bazaar'
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
