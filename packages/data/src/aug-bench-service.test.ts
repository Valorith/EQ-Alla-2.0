import { describe, expect, it } from "vitest";
import { sql } from "kysely";
import { getDb } from "./db";
import { getAugmentCatalog } from "./aug-bench-service";

describe("Aug Bench live discovery boundary", () => {
  it("returns every discovered augment exactly once with authoritative stats", async () => {
    const db = getDb();
    if (!db) throw new Error("Live database required for Aug Bench integration tests");
    const expected = await sql<{ id: number; hp: number; augtype: number }>`
      select i.id, i.hp, i.augtype from items i where i.itemclass = 0 and i.augtype > 0
        and exists(select 1 from discovered_items di where di.item_id = i.id)
      order by i.id
    `.execute(db);
    const catalog = await getAugmentCatalog();
    expect(catalog.data.length).toBeGreaterThan(0);
    expect(catalog.data.map((item) => ({ id: item.id, hp: item.stats.hp, augtype: item.augType })).sort((a, b) => a.id - b.id)).toEqual(expected.rows);
  });
  it("does not include undiscovered augments", async () => {
    const db = getDb();
    if (!db) throw new Error("Live database required");
    const hidden = await sql<{ id: number }>`select i.id from items i where i.augtype > 0
      and not exists(select 1 from discovered_items di where di.item_id = i.id) limit 10`.execute(db);
    expect(hidden.rows.length).toBeGreaterThan(0);
    const catalog = await getAugmentCatalog();
    const ids = new Set(catalog.data.map((item) => item.id));
    expect(hidden.rows.every((item) => !ids.has(item.id))).toBe(true);
  });
  it("preserves conditional damage and skill bonuses as named benefits", async () => {
    const catalog = await getAugmentCatalog();
    const diamond = catalog.data.find((item) => item.id === 42023);
    expect(diamond?.bonuses).toContainEqual({ label: "Disease damage", value: 1, unit: "" });
    expect(catalog.data.filter((item) => item.stats.skillmodvalue !== 0).every((item) => item.bonuses.some((bonus) => bonus.unit === "%"))).toBe(true);
  });
});
