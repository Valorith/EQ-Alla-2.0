import { describe, expect, it } from "vitest";
import { benchItemSchema, benchPlanSchema, loreConflict, matchingSockets, placementProblem, planFromCharacter, type BenchItem, type BenchPlan } from "./aug-bench";
import { archetypes, compareLoadoutStats, optimizeAugments, resolveArchetypeWeights, weightedAugmentScore, type StatWeights } from "./aug-optimizer";

function item(id: number, stats: Record<string, number>, extra: Partial<BenchItem> = {}): BenchItem {
  return benchItemSchema.parse({ id, name: `Aug ${id}`, icon: "1", slots: 4, classes: 65535, races: 65535, itemType: 54, augType: 3, restriction: 1, loreGroup: 0, requiredLevel: 1, recommendedLevel: 1, tradeable: true, source: "", stats, effects: [], ...extra });
}
function plan(types = [1, 2]): BenchPlan {
  return planFromCharacter({ character: { id: 1, name: "Example", classId: 1, raceId: 1, level: 60 }, retrievedAt: "2026-09-12T00:00:00Z", unavailableEquipment: 0,
    equipment: [{ slotId: 2, id: 1000, name: "Helm", icon: "1", itemType: 10, sockets: types.map((type, index) => ({ index: index + 1, type, visible: true, installedAugmentId: 900, unavailable: false })) }] });
}
const catalog = (...items: BenchItem[]) => new Map(items.map((item) => [item.id, item]));

describe("loadout stat comparison", () => {
  it("compares against equipped items, including lost and unchanged stats, regardless of the saved plan", () => {
    const original = plan();
    original.augments = { "2:1": 1 };
    const items = catalog(item(900, { ac: 4, hp: 10, mana: 5 }), item(1, { ac: 1000 }));
    const result = compareLoadoutStats({ plan: original, totals: { ac: 12, hp: 20 } }, items);
    expect(result.unknownEquipped).toBe(0);
    expect(result.changes).toEqual([
      { key: "ac", label: "AC", before: 8, after: 12, delta: 4 },
      { key: "hp", label: "HP", before: 20, after: 20, delta: 0 },
      { key: "mana", label: "Mana", before: 10, after: 0, delta: -10 }
    ]);
  });
  it("counts the highest equipped haste once and excludes unscored conditional bonuses", () => {
    const result = compareLoadoutStats({ plan: plan(), totals: { haste: 25 } }, catalog(item(900, { haste: 20, skillmodvalue: 5 })));
    expect(result.changes).toEqual([{ key: "haste", label: "Haste", before: 20, after: 25, delta: 5 }]);
  });
  it("reports hidden and unresolved equipped augments as a partial comparison", () => {
    const original = plan();
    original.character!.equipment[0].sockets[1] = { ...original.character!.equipment[0].sockets[1], installedAugmentId: null, unavailable: true };
    expect(compareLoadoutStats({ plan: original, totals: { hp: 10 } }, new Map()).unknownEquipped).toBe(2);
  });
});

describe("full archetype loadout", () => {
  it("excludes cosmetic sockets from the loadout, review counts, and equipped stat comparison", () => {
    const original = plan([1, 20, 2, 21]);
    original.character!.equipment[0].sockets.push(
      { index: 2, type: 20, visible: true, installedAugmentId: null, unavailable: true },
      { index: 4, type: 21, visible: true, installedAugmentId: 3, unavailable: false }
    );
    const items = catalog(item(1, { hp: 10 }), item(3, { hp: 1000 }, { augType: 2 ** 20 }));
    const result = optimizeAugments(original, items, { hp: 1 });
    expect(result.sockets.map((socket) => socket.key)).toEqual(["2:1", "2:3"]);
    expect(result.plan.augments).toEqual({ "2:1": 1, "2:3": 1 });
    expect(result.score).toBe(20);
    const comparison = compareLoadoutStats({ plan: original, totals: result.totals }, items);
    expect(comparison.unknownEquipped).toBe(2);
    expect(comparison.changes.find((stat) => stat.key === "hp")).toMatchObject({ before: 0, after: 20, delta: 20 });
  });
  it("relocates a flexible lore augment to maximize the entire loadout", () => {
    const items = catalog(item(1, { hp: 100 }, { loreGroup: -1 }), item(2, { hp: 90 }, { augType: 1 }), item(3, { hp: 1 }, { augType: 2 }));
    const result = optimizeAugments(plan(), items, { hp: 1 });
    expect(result.plan.augments).toEqual({ "2:1": 2, "2:2": 1 });
    expect(result.score).toBe(190);
    for (const [key, id] of Object.entries(result.plan.augments)) expect(placementProblem({ augment: items.get(id)!, slotId: 2, replacingKey: key, plan: result.plan, items })).toBeNull();
  });
  it("shares the capacity of a positive lore group across distinct item IDs", () => {
    const result = optimizeAugments(plan(), catalog(item(1, { hp: 100 }, { loreGroup: 42, augType: 1 }), item(2, { hp: 90 }, { loreGroup: 42, augType: 2 }), item(3, { hp: 80 }, { augType: 1 }), item(4, { hp: 1 }, { augType: 2 })), { hp: 1 });
    expect(result.plan.augments).toEqual({ "2:1": 3, "2:2": 2 });
    expect(result.score).toBe(170);
  });
  it("starts empty including undiscovered occupants, preserving the snapshot and ownership", () => {
    const original = plan(); original.owned = { 900: 1 }; original.wanted = { 900: 1 };
    original.character!.equipment[0].sockets[0].unavailable = true;
    const before = structuredClone(original);
    const result = optimizeAugments(original, catalog(item(1, { hp: 10 })), { hp: 1 });
    expect(result.plan.augments).toEqual({ "2:1": 1, "2:2": 1 });
    expect(result.plan.owned).toEqual({ 900: 1 });
    expect(result.plan.wanted).toEqual({ 900: 1 });
    expect(result.plan.character).toEqual(original.character);
    expect(original).toEqual(before);
    expect(result.plan.ignoreEquippedAugments).toBe(true);
    result.plan.optimization = { archetype: "tank", weights: { hp: 1 } };
    expect(benchPlanSchema.parse(JSON.parse(JSON.stringify(result.plan)))).toEqual(result.plan);
    expect(matchingSockets(item(1, { hp: 10 }), 2, result.plan)).toHaveLength(2);
  });
  it("counts haste only once, but can keep a second haste augment for its other stats", () => {
    const items = catalog(item(1, { haste: 30 }), item(2, { hp: 10 }), item(3, { haste: 10, hp: 15 }, { augType: 2 }));
    const result = optimizeAugments(plan(), items, { hp: 1, haste: 1 });
    expect(result.plan.augments).toEqual({ "2:1": 1, "2:2": 3 });
    expect(result.score).toBe(45); expect(result.totals.haste).toBe(30);
  });
  it("allows an already-equipped lore item to be picked again without favoring it", () => {
    const original = plan(); original.augments = { "2:1": 1 };
    const result = optimizeAugments(original, catalog(item(1, { hp: 100 }, { loreGroup: -1 }), item(2, { hp: 10 })), { hp: 1 });
    expect(Object.values(result.plan.augments).filter((id) => id === 1)).toHaveLength(1);
    expect(result.score).toBe(110);
  });
  it("keeps socket type, visibility, equipment, class, race, and level restrictions", () => {
    const original = plan([1, 2, 3]); original.character!.equipment[0].sockets[1].visible = false;
    const items = catalog(item(1, { hp: 10 }), item(2, { hp: 1000 }, { classes: 2 }), item(3, { hp: 1000 }, { races: 2 }), item(4, { hp: 1000 }, { restriction: 2 }), item(5, { hp: 1000 }, { slots: 8 }), item(6, { hp: 1000 }, { requiredLevel: 61 }));
    const result = optimizeAugments({ ...original, classBit: 0, raceBit: 0, level: 255 }, items, { hp: 1 });
    expect(result.plan.augments).toEqual({ "2:1": 1 });
    expect(result.sockets.map((socket) => socket.key)).toEqual(["2:1", "2:3"]);
    expect(result.sockets[1].reason).toBe("no-compatible");
  });
  it("flags unscored effect choices instead of inventing an effect ranking", () => {
    const result = optimizeAugments(plan([1]), catalog(item(1, {}, { effects: [{ id: 5, kind: "focus", name: "Focus" }] })), { hp: 1 });
    expect(result.plan.augments).toEqual({}); expect(result.sockets[0].reason).toBe("unscored");
  });
  it.each([["tank", 1], ["melee", 2], ["caster", 3], ["healer", 4]])("uses %s priorities", (role, id) => {
    const preset = archetypes.find((entry) => entry.id === role)!;
    const items = catalog(item(1, { ac: 20 }), item(2, { attack: 40 }), item(3, { spelldmg: 20 }), item(4, { healamt: 20 }));
    expect(optimizeAugments(plan([1]), items, preset.weights).plan.augments["2:1"]).toBe(id);
  });
  it.each(archetypes.filter((preset) => preset.id === "tank" || preset.id === "melee"))("values sustained disciplines in the $label preset without overwhelming core stats", (preset) => {
    const modestStats: Record<string, number> = preset.id === "tank" ? { ac: 4, hp: 10 } : { attack: 8, endur: 20 };
    const majorStats: Record<string, number> = preset.id === "tank" ? { ac: 12 } : { damage: 4 };
    const recovery = item(1, { enduranceregen: 1 });
    expect(optimizeAugments(plan([1]), catalog(recovery, item(2, modestStats)), preset.weights).plan.augments["2:1"]).toBe(1);
    expect(optimizeAugments(plan([1]), catalog(recovery, item(3, majorStats)), preset.weights).plan.augments["2:1"]).toBe(3);
    // Repeated non-lore recovery contributes in every compatible socket.
    const loadout = optimizeAugments(plan(), catalog(recovery, item(2, modestStats)), preset.weights);
    expect(loadout.plan.augments).toEqual({ "2:1": 1, "2:2": 1 });
    expect(loadout.totals.enduranceregen).toBe(2);
  });
  it.each(archetypes.filter((preset) => preset.id === "tank" || preset.id === "melee"))("refreshes saved $label defaults but retains custom weights", (preset) => {
    const previous = { ...preset.weights };
    if (preset.id === "tank") delete previous.enduranceregen;
    else previous.enduranceregen = 15;
    expect(resolveArchetypeWeights(preset, previous)).toEqual(preset.weights);
    const custom = { ...previous, hp: 99, enduranceregen: 0 };
    expect(resolveArchetypeWeights(preset, custom)).toEqual(custom);
    expect(resolveArchetypeWeights(preset, preset.weights)).toEqual(preset.weights);
    expect(previous.enduranceregen).toBe(preset.id === "tank" ? undefined : 15);
  });
  it("rejects missing characters and invalid or unsupported weights", () => {
    const invalidWeights: StatWeights[] = [{ hp: -1 }, { hp: NaN }, { hp: Infinity }, { hp: 0 }, { skillmodvalue: 1 }];
    for (const weights of invalidWeights) expect(() => optimizeAugments(plan(), new Map(), weights)).toThrow();
    expect(() => optimizeAugments({ ...plan(), character: undefined }, new Map(), { hp: 1 })).toThrow(/character/);
  });
});

// Exhaustive enumeration is independent of the flow algorithm and catches
// resource reassignment and highest-haste errors on small adversarial catalogs.
function bruteForce(p: BenchPlan, items: BenchItem[], weights: StatWeights) {
  const sockets = p.character!.equipment[0].sockets;
  let best = 0;
  function visit(index: number, selected: BenchItem[]) {
    if (index === sockets.length) {
      best = Math.max(best, selected.reduce((sum, item) => sum + weightedAugmentScore(item, weights), 0) + (weights.haste ?? 0) * Math.max(0, ...selected.map((item) => item.stats.haste ?? 0))); return;
    }
    visit(index + 1, selected);
    for (const item of items) if (matchingSockets(item, 2, p, sockets[index].index).length && !selected.some((other) => loreConflict(item, other))) visit(index + 1, [...selected, item]);
  }
  visit(0, []); return best;
}
it("matches exhaustive search for deterministic mixed lore, type, stat, and haste catalogs", () => {
  let seed = 77;
  const random = (limit: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % limit; };
  for (let run = 0; run < 30; run++) {
    const p = plan([1, 2, 1, 2]);
    const items = Array.from({ length: 6 }, (_, i) => item(i + 1, { hp: random(40) - 5, haste: random(4) * 10 }, { augType: random(3) + 1, loreGroup: [0, -1, 42][random(3)] }));
    const weights = { hp: 1.25, haste: 2 };
    expect(optimizeAugments(p, catalog(...items), weights).score).toBeCloseTo(bruteForce(p, items, weights));
  }
});
