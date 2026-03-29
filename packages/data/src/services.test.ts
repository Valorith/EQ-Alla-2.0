import { describe, expect, it } from "vitest";
import { getCatalogStats, getZoneDetail, getZonesByEra, listItems, listZoneEras, resolveLegacyRoute, searchCatalog } from "./index";

describe("catalog services", () => {
  it("filters items by tradeable flag", async () => {
    const tradeableItems = await listItems({ tradeable: true });
    expect(tradeableItems.every((item) => item.tradeable)).toBe(true);
  });

  it("normalizes whitespace in item search queries", async () => {
    const trimmed = await listItems({ q: "fiend" });
    const spaced = await listItems({ q: "  fiend  " });
    expect(spaced.map((item) => item.id)).toEqual(trimmed.map((item) => item.id));
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
    const powerZones = await getZonesByEra("power");

    expect(faydwerZones.some((zone) => zone.shortName === "mistmoore")).toBe(true);
    expect(powerZones.some((zone) => zone.shortName === "poknowledge")).toBe(true);
  });

  it("exposes stats and zone detail", async () => {
    const stats = await getCatalogStats();
    const zone = await getZoneDetail("mistmoore");
    expect(stats.items).toBeGreaterThan(0);
    expect(zone?.namedNpcs.length).toBeGreaterThan(0);
  });
});
