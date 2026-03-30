import { describe, expect, it } from "vitest";
import { getCatalogStats, getItemDetail, getSpellDetail, getZoneDetail, getZonesByEra, getZonesByLevel, listItems, listNpcs, listSpells, listZoneEras, listZones, resolveLegacyRoute, searchCatalog, spellSearchLevelCap } from "./index";

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

  it("returns populated search hits", async () => {
    const hits = await searchCatalog("mistmoore");
    expect(hits.some((hit) => hit.type === "zone")).toBe(true);
    expect(hits.some((hit) => hit.type === "npc")).toBe(true);
  }, 10_000);

  it("maps legacy item routes", () => {
    const target = resolveLegacyRoute("/", new URLSearchParams("a=item&id=1001"));
    expect(target).toBe("/items/1001");
  });

  it("exposes the legacy zone era list from the clone", async () => {
    const eras = await listZoneEras();
    expect(eras).toContain("Faydwer");
    expect(eras).toContain("The Planes of Power");
    expect(eras).toContain("Veil of Alaris");
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
