import { augmentStats, augmentTotals, conditionalStatKeys, isOrnamentationType, matchingSockets, planFromCharacter, wearableBy, withoutOrnamentation, type BenchItem, type BenchPlan } from "./aug-bench";

export type Archetype = NonNullable<BenchPlan["optimization"]>["archetype"];
export type StatWeights = Record<string, number>;
export const archetypes: { id: Archetype; label: string; description: string; weights: StatWeights }[] = [
  { id: "tank", label: "Tank", description: "Armor, health, and endurance regen for longer disciplines", weights: { ac: 12, hp: 1, enduranceregen: 60, shielding: 25, avoidance: 20, spellshield: 10, dotshielding: 8, stunresist: 5, regen: 12, heroic_sta: 5, heroic_agi: 5, heroic_dex: 4, asta: 1, aagi: 1, mr: 1, fr: 1, cr: 1, dr: 1, pr: 1 } },
  { id: "melee", label: "Melee DPS", description: "Weapon damage, endurance regen, attack, and haste", weights: { damage: 40, enduranceregen: 60, attack: 6, accuracy: 12, strikethrough: 12, combateffects: 8, haste: 15, astr: 2, adex: 2, heroic_str: 6, heroic_dex: 6, endur: 0.3, hp: 0.3, ac: 1 } },
  { id: "caster", label: "Caster DPS", description: "Spell damage, mana, and mana recovery", weights: { spelldmg: 20, mana: 1, manaregen: 30, clairvoyance: 8, aint: 2, awis: 2, heroic_int: 6, heroic_wis: 6, hp: 0.4, ac: 2 } },
  { id: "healer", label: "Healer", description: "Healing, mana recovery, and survivability", weights: { healamt: 25, manaregen: 35, mana: 1, clairvoyance: 8, awis: 2, aint: 2, heroic_wis: 6, heroic_int: 6, hp: 0.6, ac: 3, regen: 6 } }
];

// Endurance recovery sustains disciplines on this server. Upgrade saved copies
// of the original presets, while preserving any user-customized weighting.
export function resolveArchetypeWeights(preset: typeof archetypes[number], saved?: StatWeights): StatWeights {
  if (!saved) return { ...preset.weights };
  if (preset.id === "tank" || preset.id === "melee") {
    const previous = { ...preset.weights };
    if (preset.id === "tank") delete previous.enduranceregen;
    else previous.enduranceregen = 15;
    if (Object.keys(saved).length === Object.keys(previous).length && Object.entries(previous).every(([key, value]) => saved[key] === value)) return { ...preset.weights };
  }
  return { ...saved };
}

export type OptimizedSocket = { key: string; slotId: number; socketIndex: number; type: number; itemId?: number; reason?: "no-compatible" | "unscored" | "no-additional-gain" };
export type OptimizedLoadout = { plan: BenchPlan; score: number; sockets: OptimizedSocket[]; totals: Record<string, number>; alternativesChecked: number };

export function compareLoadoutStats(result: Pick<OptimizedLoadout, "plan" | "totals">, items: ReadonlyMap<number, BenchItem>) {
  const sockets = result.plan.character?.equipment.flatMap((gear) => gear.sockets.filter((socket) => !isOrnamentationType(socket.type))) ?? [];
  const equippedTotals = augmentTotals(sockets.flatMap((socket) => {
    const item = socket.installedAugmentId ? items.get(socket.installedAugmentId) : undefined;
    return item ? [item] : [];
  }));
  return {
    unknownEquipped: sockets.filter((socket) => socket.unavailable || (socket.installedAugmentId && !items.has(socket.installedAugmentId))).length,
    changes: augmentStats.map(({ key, label }) => {
      const before = equippedTotals[key] ?? 0;
      const after = result.totals[key] ?? 0;
      return { key, label, before, after, delta: after - before };
    }).filter(({ before, after }) => before !== 0 || after !== 0)
  };
}
type Choice = { item: BenchItem; score: number };
type SocketChoices = OptimizedSocket & { choices: Choice[] };
type Edge = { to: number; reverse: number; capacity: number; cost: number };
const loreKey = (item: BenchItem) => item.loreGroup === -1 ? `item:${item.id}` : item.loreGroup > 0 ? `group:${item.loreGroup}` : null;

export function weightedAugmentScore(item: BenchItem, weights: StatWeights) {
  // Haste is rewarded once for the highest augment, not once per socket.
  return Object.entries(weights).reduce((score, [key, weight]) => score + (key === "haste" ? 0 : (item.stats[key] ?? 0) * weight), 0);
}

// Exact maximum-weight assignment under socket compatibility and lore capacities.
// Non-lore items can repeat, so each socket needs only its best non-lore fallback.
// Residual edges let a later socket relocate a lore item assigned earlier.
function assign(sockets: SocketChoices[], forced?: { key: string; choice: Choice }) {
  const forcedLore = forced && loreKey(forced.choice.item);
  const available = sockets.filter((socket) => socket.key !== forced?.key);
  const groups = [...new Set(available.flatMap((socket) => socket.choices.flatMap(({ item }) => {
    const group = loreKey(item); return group && group !== forcedLore ? [group] : [];
  })))];
  const source = 0, groupStart = 1, slotStart = groupStart + groups.length, sink = slotStart + available.length;
  const graph: Edge[][] = Array.from({ length: sink + 1 }, () => []);
  const groupNodes = new Map(groups.map((group, index) => [group, groupStart + index]));
  const selections: { key: string; item: BenchItem; edge: Edge }[] = [];
  function edge(from: number, to: number, capacity: number, cost: number) {
    const forward = { to, capacity, cost, reverse: graph[to].length };
    const reverse = { to: from, capacity: 0, cost: -cost, reverse: graph[from].length };
    graph[from].push(forward); graph[to].push(reverse); return forward;
  }
  for (const node of groupNodes.values()) edge(source, node, 1, 0);
  available.forEach((socket, index) => {
    const node = slotStart + index;
    const bestByGroup = new Map<string, Choice>();
    let fallback: Choice | undefined;
    for (const choice of socket.choices) {
      const group = loreKey(choice.item);
      if (!group) { if (choice.score > (fallback?.score ?? 0)) fallback = choice; }
      else if (group !== forcedLore && choice.score > (bestByGroup.get(group)?.score ?? 0)) bestByGroup.set(group, choice);
    }
    const fallbackEdge = edge(source, node, 1, -(fallback?.score ?? 0));
    if (fallback) selections.push({ key: socket.key, item: fallback.item, edge: fallbackEdge });
    for (const [group, choice] of bestByGroup) {
      const groupNode = groupNodes.get(group);
      if (groupNode !== undefined) selections.push({ key: socket.key, item: choice.item, edge: edge(groupNode, node, 1, -choice.score) });
    }
    edge(node, sink, 1, 0);
  });
  for (let flow = 0; flow < available.length; flow++) {
    const distances = Array.from({ length: graph.length }, () => Infinity);
    const previous: { node: number; index: number }[] = [];
    const queued = Array.from({ length: graph.length }, () => false);
    const queue = [source]; distances[source] = 0; queued[source] = true;
    for (let head = 0; head < queue.length; head++) {
      const node = queue[head]; queued[node] = false;
      graph[node].forEach((candidate, index) => {
        const distance = distances[node] + candidate.cost;
        if (!candidate.capacity || distance >= distances[candidate.to] - 1e-8) return;
        distances[candidate.to] = distance; previous[candidate.to] = { node, index };
        if (!queued[candidate.to]) { queued[candidate.to] = true; queue.push(candidate.to); }
      });
    }
    let node = sink;
    while (node !== source) {
      const step = previous[node];
      if (!step) throw new Error("Could not assign equipment sockets.");
      const forward = graph[step.node][step.index];
      forward.capacity--; graph[node][forward.reverse].capacity++; node = step.node;
    }
  }
  const result: Record<string, number> = {};
  if (forced) result[forced.key] = forced.choice.item.id;
  for (const selection of selections) if (selection.edge.capacity === 0) result[selection.key] = selection.item.id;
  return result;
}

export function optimizeAugments(plan: BenchPlan, items: ReadonlyMap<number, BenchItem>, weights: StatWeights): OptimizedLoadout {
  plan = withoutOrnamentation(plan, [...items.values()]);
  if (!plan.character) throw new Error("Load a character before generating a loadout.");
  if (Object.values(weights).some((value) => !Number.isFinite(value) || value < 0 || value > 1000)) throw new Error("Stat weights must be between 0 and 1000.");
  if (Object.keys(weights).some((key) => conditionalStatKeys.has(key) || !augmentStats.some((stat) => stat.key === key))) throw new Error("Choose supported raw stats for scoring.");
  if (!Object.values(weights).some((value) => value > 0)) throw new Error("Choose at least one stat to prioritize.");
  const character = planFromCharacter(plan.character);
  if (!character.raceBit) throw new Error("This character's race is not supported by the optimizer.");
  const fresh: BenchPlan = { ...plan, classBit: character.classBit, raceBit: character.raceBit, level: character.level, augments: {}, ignoreEquippedAugments: true };
  const eligible = [...items.values()].filter((item) => wearableBy(item, fresh)).sort((a, b) => a.id - b.id);
  const sockets: SocketChoices[] = plan.character.equipment.flatMap((gear) => gear.sockets.filter((socket) => socket.visible).map((socket) => ({
    key: `${gear.slotId}:${socket.index}`, slotId: gear.slotId, socketIndex: socket.index, type: socket.type,
    choices: eligible.filter((item) => matchingSockets(item, gear.slotId, fresh, socket.index).length > 0).map((item) => ({ item, score: weightedAugmentScore(item, weights) }))
  })));
  const scorePlan = (placements: Record<string, number>) => {
    const selected = Object.values(placements).flatMap((id) => { const item = items.get(id); return item ? [item] : []; });
    return selected.reduce((sum, item) => sum + weightedAugmentScore(item, weights), 0) + (weights.haste ?? 0) * Math.max(0, ...selected.map((item) => item.stats.haste ?? 0));
  };
  let placements = assign(sockets), score = scorePlan(placements), alternativesChecked = 1;
  if ((weights.haste ?? 0) > 0) {
    // Enumerate a witness for the maximum haste value. At least one witness is
    // in every optimal loadout; solving the remaining assignment is exact.
    for (const socket of sockets) for (const choice of socket.choices) {
      if ((choice.item.stats.haste ?? 0) <= 0) continue;
      const candidate = assign(sockets, { key: socket.key, choice }); alternativesChecked++;
      const candidateScore = scorePlan(candidate);
      if (candidateScore > score + 1e-8) { placements = candidate; score = candidateScore; }
    }
  }
  return { plan: { ...fresh, augments: placements }, score, alternativesChecked,
    totals: augmentTotals(Object.values(placements).flatMap((id) => { const item = items.get(id); return item ? [item] : []; })),
    sockets: sockets.map(({ choices, ...socket }) => ({ ...socket, itemId: placements[socket.key], reason: placements[socket.key] ? undefined : !choices.length ? "no-compatible" : choices.some((choice) => choice.score > 0 || (weights.haste ?? 0) * (choice.item.stats.haste ?? 0) > 0) ? "no-additional-gain" : "unscored" }))
  };
}
