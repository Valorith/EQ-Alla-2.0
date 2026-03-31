import { describe, expect, it } from "vitest";
import { formatPlayableItemRaceMask, formatZoneEra, getCatalogStats, getItemDetail, getSpellDetail, getZoneDetail, getZonesByEra, getZonesByLevel, itemTypeFilterOptions, listFactions, listItems, listNpcs, listSpells, listZoneEras, listZones, matchesZoneEraFilter, resolveLegacyRoute, searchCatalog, spellSearchLevelCap } from "./index";
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
    expect(resolveSpellEffectDirection("Decrease Spell Mana Cost", 10)).toBe("Decrease Spell Mana Cost");
    expect(resolveSpellEffectDirection("In/Decrease Movement", -45)).toBe("Decrease Movement");
  });

  it("summarizes spell search effects using sign-aware labels", () => {
    const summary = summarizeSpellEffects({
      effectid1: 0,
      effect_base_value1: -1200,
      effectid2: 92,
      effect_base_value2: -350,
      effectid3: 132,
      effect_base_value3: 10
    });

    expect(summary).toBe("Decrease Hitpoints • Decrease hate • Decrease Spell Mana Cost");
  });

  it("caps spell search results at level 60", async () => {
    const highLevelOnly = await listSpells({ q: "Agility of the Wrulan" });
    const upperBand = await listSpells({ className: "Shaman", level: 60, levelMode: "min" });

    expect(highLevelOnly.some((spell) => spell.id === 3378)).toBe(false);
    expect(upperBand.length).toBeGreaterThan(0);
    expect(upperBand.every((spell) => spell.level <= spellSearchLevelCap)).toBe(true);
  });

  it("excludes high-status zones from zones by level", async () => {
    const zones = await getZonesByLevel();
    expect(zones.some((zone) => zone.shortName === "poknowledge")).toBe(false);
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
    expect(eras).toContain("Faydwer");
    expect(eras).toContain("The Planes of Power");
    expect(eras).toContain("Veil of Alaris");
  });

  it("prefers canonical classic zone era labels over raw expansion values", () => {
    expect(formatZoneEra("nektulos", 1)).toBe("Antonica");
    expect(formatZoneEra("mistmoore", 1)).toBe("Faydwer");
    expect(formatZoneEra("sebilis", 1)).toBe("Ruins of Kunark");
  });

  it("matches classic era filters using zone short names even when expansion data is misleading", () => {
    expect(matchesZoneEraFilter({ shortName: "nektulos", era: "Ruins of Kunark" }, "Antonica")).toBe(true);
    expect(matchesZoneEraFilter({ shortName: "nektulos", era: "Ruins of Kunark" }, "Kunark")).toBe(false);
  });

  it("resolves clone-style zone era filters and slugs", async () => {
    const faydwerZones = await getZonesByEra("Faydwer");

    expect(faydwerZones.some((zone) => zone.shortName === "mistmoore")).toBe(true);
    expect(faydwerZones.some((zone) => zone.shortName === "poknowledge")).toBe(false);
  });

  it("exposes stats and zone detail", async () => {
    const stats = await getCatalogStats();
    const zone = await getZoneDetail("mistmoore");
    expect(stats.items).toBeGreaterThan(0);
    expect(zone?.namedNpcs.length).toBeGreaterThan(0);
  });

  it("includes shared spawn versions in zone detail bestiary data", async () => {
    const zone = await getZoneDetail("fearplane");
    expect(zone?.bestiary.length).toBeGreaterThan(1);
    expect(zone?.bestiary.some((npc) => npc.name === "a dracoliche")).toBe(true);
  });
});
