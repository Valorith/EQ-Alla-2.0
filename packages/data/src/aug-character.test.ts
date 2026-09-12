import { describe, expect, it } from "vitest";
import { acquisitionList, benchItemSchema, benchPlanSchema, emptyBenchPlan, fitsEquipmentRestriction, isPlanningAugment, matchingSockets, placementProblem, placementSocket, planFromCharacter, planningAugmentTypes, withoutOrnamentation, type BenchCharacterProfile } from "./aug-bench";

const augment = benchItemSchema.parse({ id: 2, name: "Augment", icon: "1", slots: 4, classes: 65535, races: 65535, itemType: 54, augType: 1, restriction: 1, loreGroup: 0, requiredLevel: 1, recommendedLevel: 1, tradeable: true, source: "", stats: { hp: 100 }, effects: [] });
function profile(): BenchCharacterProfile {
  return { character: { id: 1, name: "Example", classId: 1, raceId: 330, level: 60 }, retrievedAt: "2026-09-12T00:00:00Z", unavailableEquipment: 0,
    equipment: [{ slotId: 2, id: 100, name: "Helm", icon: "1", itemType: 10, sockets: [
      { index: 1, type: 1, visible: true, installedAugmentId: 2, unavailable: false },
      { index: 2, type: 7, visible: true, installedAugmentId: null, unavailable: false },
      { index: 3, type: 1, visible: true, installedAugmentId: null, unavailable: false },
      { index: 4, type: 1, visible: true, installedAugmentId: null, unavailable: true },
      { index: 5, type: 1, visible: false, installedAugmentId: null, unavailable: false }
    ] }] };
}
describe("character socket planning", () => {
  it("omits ornamentation sockets without renumbering functional sockets or counting cosmetic ownership", () => {
    const equipped = profile();
    equipped.equipment[0].sockets[1] = { index: 2, type: 20, visible: true, installedAugmentId: 3, unavailable: false };
    equipped.equipment[0].sockets[3].type = 21;
    const original = structuredClone(equipped);
    const plan = planFromCharacter(equipped);
    expect(plan.character?.equipment[0].sockets.map((socket) => socket.index)).toEqual([1, 3, 5]);
    expect(plan.augments).toEqual({ "2:1": 2 });
    expect(plan.owned).toEqual({ 2: 1 });
    expect(equipped).toEqual(original);
  });
  it("migrates restored and imported cosmetic placements and wish lists, preserving the remaining plan", () => {
    const equipped = profile();
    equipped.equipment[0].sockets[1].type = 20;
    equipped.equipment[0].sockets[3].type = 21;
    const cosmetic = { ...augment, id: 3, augType: 2 ** 19 + 2 ** 20 };
    const saved = { ...emptyBenchPlan(), character: equipped, augments: { "2:1": 2, "2:2": 3, "2:4": 3 }, owned: { 2: 1, 3: 2 }, wanted: { 3: 1 } };
    const original = structuredClone(saved);
    const migrated = withoutOrnamentation(benchPlanSchema.parse(saved), [augment, cosmetic]);
    expect(migrated.augments).toEqual({ "2:1": 2 });
    expect(migrated.owned).toEqual({ 2: 1 });
    expect(migrated.wanted).toEqual({});
    expect(migrated.character?.equipment[0].sockets.map((socket) => socket.index)).toEqual([1, 3, 5]);
    expect(withoutOrnamentation(migrated, [augment, cosmetic])).toBe(migrated);
    expect(saved).toEqual(original);
    expect(withoutOrnamentation({ ...saved, character: undefined }, [augment, cosmetic]).augments).toEqual({ "2:1": 2 });
    expect(acquisitionList(saved, new Map([[2, augment], [3, cosmetic]])).map(({ item }) => item.id)).toEqual([2]);
  });
  it("keeps mixed functional augment masks but rejects cosmetic types for placements", () => {
    const mixed = { ...augment, augType: 1 + 2 ** 19 + 2 ** 20 };
    expect(planningAugmentTypes(mixed.augType)).toEqual([1]);
    expect(isPlanningAugment(mixed)).toBe(true);
    expect(isPlanningAugment({ ...augment, augType: 2 ** 19 + 2 ** 20 })).toBe(false);
    const equipped = profile(); equipped.equipment[0].sockets[1].type = 20;
    const plan = { ...emptyBenchPlan(), character: equipped };
    expect(matchingSockets(mixed, 2, plan).map((socket) => socket.index)).toEqual([1, 3]);
    expect(placementProblem({ augment: { ...augment, augType: 2 ** 19 }, slotId: 2, plan: emptyBenchPlan(), items: new Map() })).not.toBeNull();
  });
  it("imports installed augments into exact sockets and counts equipped ownership", () => {
    const plan = planFromCharacter(profile());
    expect(plan.augments).toEqual({ "2:1": 2 });
    expect(plan.owned).toEqual({ 2: 1 });
    expect(plan).toMatchObject({ classBit: 1, raceBit: 16384, level: 60 });
    expect(benchPlanSchema.parse(JSON.parse(JSON.stringify(plan)))).toEqual(plan);
  });
  it("rejects imported profiles with duplicate equipment positions or socket indices", () => {
    const duplicateGear = profile();
    duplicateGear.equipment.push(structuredClone(duplicateGear.equipment[0]));
    expect(benchPlanSchema.safeParse({ ...emptyBenchPlan(), character: duplicateGear }).success).toBe(false);
    const duplicateSocket = profile();
    duplicateSocket.equipment[0].sockets[1].index = 1;
    expect(benchPlanSchema.safeParse({ ...emptyBenchPlan(), character: duplicateSocket }).success).toBe(false);
  });
  it("matches type and visibility, reserves unknown occupants, and chooses the first compatible empty socket", () => {
    const plan = planFromCharacter(profile());
    expect(matchingSockets(augment, 2, plan).map((socket) => socket.index)).toEqual([1, 3]);
    expect(placementSocket(augment, 2, plan)?.index).toBe(3);
    expect(placementSocket({ ...augment, augType: 64 }, 2, plan)?.index).toBe(2);
    expect(placementSocket(augment, 2, plan, undefined, 2)).toBeUndefined();
    expect(placementSocket(augment, 2, plan, undefined, 4)).toBeUndefined();
    expect(placementSocket(augment, 2, plan, undefined, 5)).toBeUndefined();
    expect(placementSocket(augment, 3, plan)).toBeUndefined();
  });
  it("never overfills, but permits explicit replacements and moves", () => {
    const plan = planFromCharacter(profile()); plan.augments["2:3"] = 2;
    const items = new Map([[2, augment]]);
    expect(placementProblem({ augment, slotId: 2, plan, items })).toMatch(/empty socket/);
    expect(placementProblem({ augment, slotId: 2, replacingKey: "2:1", plan, items })).toBeNull();
    expect(placementSocket(augment, 2, plan, undefined, 1, "2:1")?.index).toBe(1);
    expect(placementSocket(augment, 2, plan, "2:2")).toBeUndefined();
  });
  it("enforces lore and character requirements after socket validation", () => {
    const plan = planFromCharacter(profile());
    expect(placementProblem({ augment: { ...augment, loreGroup: -1 }, slotId: 2, plan, items: new Map([[2, augment]]) })).toMatch(/Lore/);
    expect(placementProblem({ augment: { ...augment, classes: 2 }, slotId: 2, plan, items: new Map() })).toMatch(/Class/);
    expect(placementProblem({ augment: { ...augment, requiredLevel: 61 }, slotId: 2, plan, items: new Map() })).toMatch(/level/);
  });
  it.each([[1, 10], [2, 5], [3, 45], [4, 35], [5, 0], [6, 3], [7, 2], [8, 45], [9, 1], [10, 4], [11, 35], [12, 5], [13, 8], [14, 0], [15, 45]])("enforces restriction %i", (restriction, itemType) => {
    expect(fitsEquipmentRestriction({ ...augment, restriction }, itemType)).toBe(true);
    expect(fitsEquipmentRestriction({ ...augment, restriction }, 11)).toBe(false);
  });
  it("keeps free planning independent of gear", () => {
    expect(placementProblem({ augment, slotId: 2, plan: emptyBenchPlan(), items: new Map() })).toBeNull();
  });
});
