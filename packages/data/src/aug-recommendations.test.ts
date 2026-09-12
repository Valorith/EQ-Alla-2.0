import { describe, expect, it } from "vitest";
import { augmentMoveTargets, benchItemSchema, placementProblem, planFromCharacter, type BenchItem, type BenchCharacterProfile } from "./aug-bench";
import { compareAugments, recommendAugments } from "./aug-recommendations";

const base = benchItemSchema.parse({ id: 1, name: "Current", icon: "1", slots: 4, classes: 65535, races: 65535, itemType: 54,
  augType: 1, restriction: 1, loreGroup: 0, requiredLevel: 1, recommendedLevel: 1, tradeable: true, source: "", stats: { hp: 10, ac: 5 }, effects: [] });
const item = (id: number, changes: Partial<BenchItem> = {}): BenchItem => ({ ...base, id, name: `Candidate ${id}`, ...changes });
function setup() {
  const profile: BenchCharacterProfile = { character: { id: 1, name: "Example", classId: 1, raceId: 1, level: 60 }, retrievedAt: "2026-09-12T00:00:00Z", unavailableEquipment: 0,
    equipment: [{ slotId: 2, id: 100, name: "Helm", icon: "1", itemType: 10, sockets: [
      { index: 1, type: 1, visible: true, installedAugmentId: 1, unavailable: false },
      { index: 2, type: 1, visible: true, installedAugmentId: null, unavailable: false },
      { index: 3, type: 2, visible: true, installedAugmentId: null, unavailable: false },
      { index: 4, type: 1, visible: true, installedAugmentId: null, unavailable: true },
      { index: 5, type: 1, visible: false, installedAugmentId: null, unavailable: false }
    ] }] };
  return planFromCharacter(profile);
}
const catalog = (...others: BenchItem[]) => new Map([base, ...others].map((entry) => [entry.id, entry]));

describe("socket recommendations", () => {
  it("never creates cosmetic socket suggestions or move destinations for an older character snapshot", () => {
    const plan = setup();
    plan.character!.equipment[0].sockets.push({ index: 6, type: 21, visible: true, installedAugmentId: null, unavailable: false });
    const items = catalog(item(2, { augType: 1 + 2 ** 20, stats: { hp: 100 } }));
    expect(recommendAugments(plan, items, "hp").get(2)!.map((socket) => socket.index)).toEqual([1, 2, 3, 4]);
    expect(augmentMoveTargets(plan, items, "2:1").some((target) => target.socketIndex === 6)).toBe(false);
  });
  it("separates raw upgrades, priority tradeoffs, alternatives, and empty-socket fills", () => {
    const items = catalog(item(2, { stats: { hp: 20, ac: 5 } }), item(3, { stats: { hp: 30, ac: 3 } }), item(4, { stats: { hp: 5, ac: 10 } }));
    const sockets = recommendAugments(setup(), items, "hp").get(2)!;
    expect(sockets[0].candidates.map((entry) => [entry.item.id, entry.kind])).toEqual([[3, "tradeoff"], [2, "upgrade"], [4, "alternative"]]);
    expect(sockets[1].candidates.every((entry) => entry.kind === "fill")).toBe(true);
    expect(recommendAugments(setup(), items, "ac").get(2)![0].candidates[0]).toMatchObject({ item: { id: 4 }, kind: "tradeoff" });
  });
  it("excludes wrong type, slot, restriction, class, race, level, hidden and unknown sockets", () => {
    const items = catalog(item(2, { augType: 2 }), item(3, { slots: 8 }), item(4, { restriction: 2 }), item(5, { classes: 2 }), item(6, { races: 2 }), item(7, { requiredLevel: 61 }));
    const sockets = recommendAugments(setup(), items, "hp").get(2)!;
    expect(sockets.map((socket) => socket.index)).toEqual([1, 2, 3, 4]);
    expect(sockets[0].candidates).toEqual([]);
    expect(sockets[2].candidates.map((entry) => entry.item.id)).toEqual([2]);
    expect(sockets[3]).toMatchObject({ blocked: true, candidates: [] });
  });
  it("respects lore elsewhere but permits replacing the conflicting occupant", () => {
    const items = catalog({ ...base, loreGroup: 42 }, item(2, { loreGroup: 42, stats: { hp: 20, ac: 5 } }));
    const sockets = recommendAugments(setup(), items, "hp").get(2)!;
    expect(sockets[0].candidates.map((entry) => entry.item.id)).toEqual([2]);
    expect(sockets[1].candidates).toEqual([]);
  });
  it("never suggests a second copy of a unique lore augment, even in another equipment position", () => {
    const plan = setup();
    const unique = item(2, { slots: 12, loreGroup: -1, stats: { hp: 50, ac: 5 } });
    const items = catalog(unique);
    plan.augments["3:1"] = unique.id;
    const sockets = recommendAugments(plan, items, "hp").get(2)!;
    expect(sockets.every((socket) => socket.candidates.every((candidate) => candidate.item.id !== unique.id))).toBe(true);
    expect(placementProblem({ augment: unique, slotId: 2, socketIndex: 2, plan, items })).toMatch(/Lore conflict/);
    expect(placementProblem({ augment: unique, slotId: 2, replacingKey: "2:1", plan, items })).toMatch(/Lore conflict/);
  });
  it("withdraws lore recommendations from other sockets immediately after planning a copy", () => {
    const plan = setup();
    const unique = item(2, { loreGroup: -1, stats: { hp: 50, ac: 5 } });
    const items = catalog(unique);
    expect(recommendAugments(plan, items, "hp").get(2)![0].candidates.some((entry) => entry.item.id === unique.id)).toBe(true);
    plan.augments["2:2"] = unique.id;
    expect(recommendAugments(plan, items, "hp").get(2)![0].candidates.some((entry) => entry.item.id === unique.id)).toBe(false);
    expect(placementProblem({ augment: unique, slotId: 2, replacingKey: "2:1", plan, items })).toMatch(/Lore conflict/);
    delete plan.augments["2:2"];
    expect(recommendAugments(plan, items, "hp").get(2)![0].candidates.some((entry) => entry.item.id === unique.id)).toBe(true);
  });
  it("rejects a different augment in the same lore group across equipment positions", () => {
    const plan = setup(); plan.augments["3:1"] = 3;
    const candidate = item(2, { loreGroup: 42, stats: { hp: 50, ac: 5 } });
    const items = catalog(candidate, item(3, { loreGroup: 42, slots: 8 }));
    expect(recommendAugments(plan, items, "hp").get(2)![0].candidates.some((entry) => entry.item.id === candidate.id)).toBe(false);
  });
  it("offers only compatible empty move destinations and moves a lore copy without duplicating it", () => {
    const plan = setup();
    const unique = { ...base, loreGroup: -1 };
    const items = catalog(unique);
    const targets = augmentMoveTargets(plan, items, "2:1");
    expect(targets.map((entry) => entry.key)).toEqual(["2:2"]);
    expect(placementProblem({ augment: unique, slotId: 2, socketIndex: 2, plan, items })).toMatch(/Lore conflict/);
    expect(placementProblem({ augment: unique, slotId: 2, socketIndex: 2, movingFrom: "2:1", plan, items })).toBeNull();
    plan.augments["2:2"] = 1; delete plan.augments["2:1"];
    expect(augmentMoveTargets(plan, items, "2:2").map((entry) => entry.key)).toEqual(["2:1"]);
    plan.augments["2:1"] = 1;
    expect(augmentMoveTargets(plan, items, "2:2")).toEqual([]);
  });
  it("subtracts copies already allocated and recomputes against the current plan", () => {
    const plan = setup(); plan.owned[2] = 1; plan.augments["2:2"] = 2;
    const items = catalog(item(2, { stats: { hp: 20, ac: 5 } }), item(3, { stats: { hp: 15, ac: 5 } }));
    const sockets = recommendAugments(plan, items, "hp").get(2)!;
    expect(sockets[0].candidates.find((entry) => entry.item.id === 2)?.availableOwned).toBe(0);
    expect(sockets[1].current?.id).toBe(2);
    expect(sockets[1].candidates.find((entry) => entry.item.id === 3)).toMatchObject({ kind: "alternative", priorityGain: -5 });
    delete plan.augments["2:2"];
    expect(recommendAugments(plan, items, "hp").get(2)![0].candidates.find((entry) => entry.item.id === 2)?.availableOwned).toBe(1);
  });
  it("shows conditional and effect losses rather than treating unlike bonuses as equivalent", () => {
    const current = { ...base, bonuses: [{ label: "Fire damage", value: 5, unit: "" }], effects: [{ kind: "Worn", id: 10, name: "Regeneration" }] };
    const candidate = item(2, { stats: { hp: 20, ac: 5 }, bonuses: [{ label: "Cold damage", value: 5, unit: "" }], effects: [{ kind: "Worn", id: 11, name: "Different effect" }] });
    const comparison = compareAugments(candidate, current);
    expect(comparison.changes).toEqual(expect.arrayContaining([expect.objectContaining({ label: "Fire damage", delta: -5 }), expect.objectContaining({ label: "Cold damage", delta: 5 })]));
    expect(comparison.lostEffects).toEqual(current.effects);
    expect(recommendAugments(setup(), catalog(current, candidate), "hp").get(2)![0].candidates[0].kind).toBe("tradeoff");
  });
  it("does not promise an upgrade when recommended-level scaling is involved", () => {
    expect(recommendAugments(setup(), catalog(item(2, { recommendedLevel: 65, stats: { hp: 20, ac: 5 } })), "hp").get(2)![0].candidates[0].kind).toBe("tradeoff");
  });
  it("uses only supplied discovered records and never treats an unresolved occupant as empty", () => {
    const plan = setup(); plan.augments["2:1"] = 999;
    expect(recommendAugments(plan, catalog(item(2)), "hp").get(2)![0]).toMatchObject({ blocked: true, candidates: [] });
    expect(recommendAugments({ ...plan, character: undefined }, catalog(), "hp").size).toBe(0);
  });
});
