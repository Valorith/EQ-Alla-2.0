import { augmentStats, conditionalStatKeys, placementProblem, withoutOrnamentation, type BenchItem, type BenchPlan } from "./aug-bench";

export const recommendationPriorities = augmentStats.filter(({ key }) => !conditionalStatKeys.has(key));
export type StatChange = { label: string; key: string; before: number; after: number; delta: number; unit: string };
export type AugmentRecommendation = {
  item: BenchItem;
  changes: StatChange[];
  gainedEffects: BenchItem["effects"];
  lostEffects: BenchItem["effects"];
  kind: "fill" | "upgrade" | "tradeoff" | "alternative";
  recommended: boolean;
  priorityGain: number;
  availableOwned: number;
};
export type SocketRecommendations = {
  key: string; index: number; type: number; current: BenchItem | undefined;
  blocked: boolean; candidates: AugmentRecommendation[];
};

// Compare each socket's raw item values. Conditional bonuses keep their identity,
// and spell effects are compared by kind + ID rather than guessed potency.
export function compareAugments(item: BenchItem, current?: BenchItem) {
  const changes: StatChange[] = recommendationPriorities.map(({ key, label }) => {
    const before = current?.stats[key] ?? 0;
    const after = item.stats[key] ?? 0;
    return { key, label, before, after, delta: after - before, unit: "" };
  });
  const bonusKey = (bonus: BenchItem["bonuses"][number]) => JSON.stringify([bonus.label, bonus.unit]);
  const beforeBonuses = new Map(current?.bonuses.map((bonus) => [bonusKey(bonus), bonus]));
  const afterBonuses = new Map(item.bonuses.map((bonus) => [bonusKey(bonus), bonus]));
  for (const key of new Set([...beforeBonuses.keys(), ...afterBonuses.keys()])) {
    const bonus = afterBonuses.get(key) ?? beforeBonuses.get(key);
    if (!bonus) continue;
    const before = beforeBonuses.get(key)?.value ?? 0;
    const after = afterBonuses.get(key)?.value ?? 0;
    changes.push({ key, label: bonus.label, unit: bonus.unit, before, after, delta: after - before });
  }
  const sameEffect = (a: BenchItem["effects"][number], b: BenchItem["effects"][number]) => a.kind === b.kind && a.id === b.id;
  return {
    changes: changes.filter((change) => change.delta !== 0),
    gainedEffects: item.effects.filter((effect) => !current?.effects.some((other) => sameEffect(effect, other))),
    lostEffects: current?.effects.filter((effect) => !item.effects.some((other) => sameEffect(effect, other))) ?? []
  };
}

export function recommendAugments(plan: BenchPlan, items: ReadonlyMap<number, BenchItem>, priority: string) {
  plan = withoutOrnamentation(plan, [...items.values()]);
  const result = new Map<number, SocketRecommendations[]>();
  for (const gear of plan.character?.equipment ?? []) {
    result.set(gear.slotId, gear.sockets.filter((socket) => socket.visible).map((socket) => {
      const key = `${gear.slotId}:${socket.index}`;
      const current = items.get(plan.augments[key]);
      const blocked = (socket.unavailable && !plan.ignoreEquippedAugments) || Boolean(plan.augments[key] && !current);
      const candidates: AugmentRecommendation[] = [];
      if (!blocked) for (const item of items.values()) {
        if (item.id === current?.id || placementProblem({ augment: item, slotId: gear.slotId, socketIndex: socket.index,
          replacingKey: current ? key : undefined, plan, items })) continue;
        const comparison = compareAugments(item, current);
        const priorityGain = comparison.changes.find((change) => change.key === priority)?.delta ?? 0;
        const losses = comparison.changes.some((change) => change.delta < 0) || comparison.lostEffects.length > 0;
        const gains = comparison.changes.some((change) => change.delta > 0);
        // Below recommended level, raw values do not prove an improvement in game.
        const scaled = item.recommendedLevel > plan.level || (current?.recommendedLevel ?? 0) > plan.level;
        const kind = !current ? "fill" : gains && !losses && !scaled ? "upgrade" : priorityGain > 0 ? "tradeoff" : "alternative";
        const usedElsewhere = Object.entries(plan.augments).filter(([otherKey, id]) => otherKey !== key && id === item.id).length;
        candidates.push({ item, ...comparison, kind, recommended: kind !== "alternative", priorityGain,
          availableOwned: Math.max(0, (plan.owned[item.id] ?? 0) - usedElsewhere) });
      }
      candidates.sort((a, b) => Number(b.recommended) - Number(a.recommended)
        || b.priorityGain - a.priorityGain || Number(b.kind === "upgrade") - Number(a.kind === "upgrade")
        || Number(b.availableOwned > 0) - Number(a.availableOwned > 0) || a.item.name.localeCompare(b.item.name) || a.item.id - b.item.id);
      return { key, index: socket.index, type: socket.type, current, blocked, candidates };
    }));
  }
  return result;
}
