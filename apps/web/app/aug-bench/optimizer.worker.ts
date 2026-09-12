import { optimizeAugments, type StatWeights } from "@eq-alla/data/aug-optimizer";
import type { BenchItem, BenchPlan } from "@eq-alla/data/aug-bench";

self.addEventListener("message", (event: MessageEvent<{ plan: BenchPlan; items: BenchItem[]; weights: StatWeights }>) => {
  try {
    const { plan, items, weights } = event.data;
    const result = optimizeAugments(plan, new Map(items.map((item) => [item.id, item])), weights);
    self.postMessage({ kind: "ready", result });
  } catch (error) {
    self.postMessage({ kind: "error", message: error instanceof Error ? error.message : "Could not generate this loadout." });
  }
});
