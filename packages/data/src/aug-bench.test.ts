import { describe, expect, it } from "vitest";
import { acquisitionList, augmentTotals, augmentTypes, benchItemSchema, benchPlanSchema, emptyBenchPlan, equipmentSlots, fitsPosition, nextPlanKey, placementProblem, type BenchItem } from "./aug-bench";

const augment: BenchItem = benchItemSchema.parse({ id: 2, name: "Augment", icon: "1", slots: 4, classes: 65535, races: 65535, itemType: 54, augType: 1, restriction: 1, loreGroup: 0, requiredLevel: 1, recommendedLevel: 1, tradeable: true, source: "", stats: { hp: 100, ac: 10 }, effects: [] });
function check(overrides: Partial<Parameters<typeof placementProblem>[0]> = {}) {
  return placementProblem({ augment, slotId: 2, plan: emptyBenchPlan(), items: new Map([[2, augment]]), ...overrides });
}

describe("Aug Bench position planning", () => {
  it("uses position masks without needing gear or a socket type", () => {
    expect(check()).toBeNull();
    expect(check({ augment: { ...augment, augType: 128, restriction: 13 } })).toBeNull();
    expect(check({ slotId: 3 })).toMatch(/position/);
    expect(check({ augment: { ...augment, augType: 0 } })).toMatch(/position/);
    expect(check({ slotId: 99 })).toMatch(/position/);
    expect(augmentTypes(65)).toEqual([1, 7]);
    expect(augmentTypes(2147483648)).toEqual([32]);
  });
  it.each(equipmentSlots)("maps $label to its actual bit", ({ id, mask }) => {
    expect(fitsPosition({ ...augment, slots: mask }, id)).toBe(true);
    expect(equipmentSlots.filter((slot) => fitsPosition({ ...augment, slots: mask }, slot.id))).toHaveLength(1);
  });
  it("keeps class, race and level requirements", () => {
    expect(check({ plan: { ...emptyBenchPlan(), classBit: 2 }, augment: { ...augment, classes: 1 } })).toMatch(/Class/);
    expect(check({ plan: { ...emptyBenchPlan(), raceBit: 2 }, augment: { ...augment, races: 1 } })).toMatch(/race/);
    expect(check({ augment: { ...augment, requiredLevel: 66 } })).toMatch(/level/);
  });
  it("supports several planned augments per position without pretending to know socket capacity", () => {
    const plan = { ...emptyBenchPlan(), augments: { "2:1": 2, "2:2": 2, "2:4": 2 } };
    expect(nextPlanKey(plan, 2)).toBe("2:3");
    expect(nextPlanKey(plan, 0)).toBe("0:1");
    expect(check({ plan })).toBeNull();
    expect(benchPlanSchema.safeParse({ ...plan, augments: { "2:7": 2 } }).success).toBe(true);
  });
  it("enforces lore but allows moving or replacing the original", () => {
    const loreAugment = { ...augment, loreGroup: -1 };
    const plan = { ...emptyBenchPlan(), augments: { "2:1": 2 } };
    expect(check({ augment: loreAugment, plan })).toMatch(/Lore conflict/);
    expect(check({ augment: loreAugment, plan, movingFrom: "2:1" })).toBeNull();
    expect(check({ augment: loreAugment, plan, replacingKey: "2:1" })).toBeNull();
    const other = { ...augment, id: 3, loreGroup: 50 };
    expect(check({ augment: { ...augment, loreGroup: 50 }, plan: { ...plan, augments: { "3:1": 3 } }, items: new Map([[3, other]]) })).toMatch(/Lore conflict/);
  });
  it("keeps a build usable by a common class and race", () => {
    expect(check({ augment: { ...augment, classes: 1 }, plan: { ...emptyBenchPlan(), augments: { "3:1": 3 } }, items: new Map([[3, { ...augment, id: 3, classes: 2 }]]) })).toMatch(/No shared class/);
  });
});

describe("Aug Bench saved plans", () => {
  it("migrates old equipment plans without losing placements or ownership", () => {
    const old = { ...emptyBenchPlan(), version: 1, equipment: { 2: 1001 }, augments: { "2:1": 2, "2:3": 3 }, owned: { 2: 1 }, wanted: { 3: 2 } };
    const result = benchPlanSchema.parse(old);
    expect(result).toEqual({ ...old, version: 2, equipment: undefined });
    expect("equipment" in result).toBe(false);
    expect(benchPlanSchema.parse(JSON.parse(JSON.stringify(result)))).toEqual(result);
  });
  it("subtracts owned quantities without double counting planned augments and wish lists", () => {
    const plan = { ...emptyBenchPlan(), augments: { "2:1": 2, "2:2": 2 }, wanted: { 2: 1 }, owned: { 2: 1 } };
    const items = new Map([[2, augment]]);
    expect(acquisitionList(plan, items)[0]).toMatchObject({ quantity: 2, owned: 1, missing: 1 });
    expect(acquisitionList({ ...plan, wanted: { 2: 4 } }, items)[0].missing).toBe(3);
    expect(acquisitionList({ ...plan, owned: { 2: 9 } }, items)[0].missing).toBe(0);
    expect(acquisitionList(plan, new Map())).toEqual([]);
  });
  it("sums raw stats but does not stack haste or conditional bonuses", () => {
    expect(augmentTotals([augment, { ...augment, stats: { hp: 50, ac: -1, haste: 20 } }, { ...augment, stats: { haste: 10 } }])).toMatchObject({ hp: 150, ac: 9, haste: 20 });
    expect(augmentTotals([{ ...augment, stats: { skillmodvalue: 5, elemdmgamt: 2, bardvalue: 18 } }])).toMatchObject({ skillmodvalue: 0, elemdmgamt: 0, bardvalue: 0 });
  });
  it("rejects invalid versions, positions, entry keys and quantities", () => {
    for (const invalid of [{ version: 3 }, { augments: { "99:1": 2 } }, { augments: { "2:0": 2 } }, { owned: { 2: -1 } }, { owned: { 2: 1.5 } }]) {
      expect(benchPlanSchema.safeParse({ ...emptyBenchPlan(), ...invalid }).success).toBe(false);
    }
  });
});
