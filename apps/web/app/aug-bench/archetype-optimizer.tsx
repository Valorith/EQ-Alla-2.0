"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ExternalLink, Heart, Minus, Plus, Shield, Sparkles, Swords, WandSparkles, X } from "lucide-react";
import { acquisitionList, augmentStats, conditionalStatKeys, equipmentSlots, type BenchItem, type BenchPlan } from "@eq-alla/data/aug-bench";
import { archetypes, compareLoadoutStats, resolveArchetypeWeights, type Archetype, type OptimizedLoadout, type StatWeights } from "@eq-alla/data/aug-optimizer";
import { recommendationPriorities } from "@eq-alla/data/aug-recommendations";
import { ItemIcon } from "../../components/item-icon";

type Generation = { kind: "idle" } | { kind: "working" } | { kind: "error"; message: string } | { kind: "ready"; result: OptimizedLoadout };
const icons = { tank: Shield, melee: Swords, caster: WandSparkles, healer: Heart };
const reasons = { "no-compatible": "No compatible augment discovered", unscored: "Effects or unweighted stats · choose manually", "no-additional-gain": "Lore conflicts or a bonus already covered elsewhere" };

function LoadoutDiffRow({ action, item, fallback }: { action: "remove" | "add" | "keep"; item?: BenchItem; fallback?: string }) {
  const Icon = action === "remove" ? Minus : action === "add" ? Plus : Check;
  const benefits = item ? [
    ...augmentStats.filter(({ key }) => item.stats[key] && !conditionalStatKeys.has(key)).map(({ key, label }) => `${item.stats[key] > 0 ? "+" : ""}${item.stats[key]} ${label}`),
    ...item.bonuses.map((bonus) => `${bonus.value > 0 ? "+" : ""}${bonus.value}${bonus.unit} ${bonus.label}`),
    ...item.effects.map((effect) => `${effect.kind}: ${effect.name}`)
  ] : [];
  return <div className={`ab-loadout-diff-row is-${action}`}>
    <span className="ab-loadout-diff-action"><Icon size={15} aria-hidden="true" />{action === "remove" ? "Remove" : action === "add" ? "Add" : "Keep"}</span>
    {item && <ItemIcon icon={item.icon} name={item.name} size="sm" />}
    <div className="ab-loadout-diff-item">{item ? <><a className="ab-loadout-item-link" href={`/items/${item.id}`} target="_blank" rel="noopener noreferrer" title="Open item in a new tab">{item.name}<ExternalLink size={12} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a><small>{[benefits.slice(0, 4).join(" · "), benefits.length > 4 ? `${benefits.length - 4} more benefits` : "", item.loreGroup !== 0 ? "Lore" : ""].filter(Boolean).join(" · ") || "Appearance / utility"}</small></> : <span>{fallback}</span>}</div>
  </div>;
}

function LoadoutReview({ result, role, items, onApply, onClose }: {
  result: OptimizedLoadout; role: string; items: ReadonlyMap<number, BenchItem>; onApply: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const title = useId();
  const planned = Object.keys(result.plan.augments).length;
  const missing = acquisitionList(result.plan, items).reduce((sum, entry) => sum + entry.missing, 0);
  const { changes: statChanges, unknownEquipped } = compareLoadoutStats(result, items);
  useEffect(() => {
    const opener = document.activeElement;
    const dialog = ref.current; dialog?.showModal();
    return () => { dialog?.close(); if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className="ab-recommendations-dialog ab-loadout-dialog" aria-labelledby={title} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="ab-rec-shell">
    <header className="ab-rec-header"><div><p className="ab-eyebrow"><Sparkles size={14} /> ARCHETYPE OPTIMIZER</p><h2 id={title}>{role}<span> / Full loadout</span></h2><p>{result.plan.character?.character.name} · Built fresh from equipment sockets</p></div><button autoFocus aria-label="Close loadout review" onClick={onClose}><X size={20} /></button></header>
    <div className="ab-loadout-overview"><div><strong>{planned}<small> / {result.sockets.length}</small></strong><span>sockets planned</span></div><div><strong>{result.sockets.length - planned}</strong><span>need review</span></div><div><strong>{missing}</strong><span>to acquire</span></div><div><strong>{Math.round(result.score).toLocaleString()}</strong><span>weighted stat score</span></div></div>
    <div className="ab-rec-content">
      <section className="ab-loadout-totals" aria-label="Augment contribution changes"><h3>Augment contribution · Net change</h3><p>Compared with equipped augments. Totals shown below each change.</p>{unknownEquipped > 0 && <p className="ab-loadout-incomplete">Partial comparison: {unknownEquipped} equipped {unknownEquipped === 1 ? "augment has" : "augments have"} unavailable stats and {unknownEquipped === 1 ? "is" : "are"} excluded from equipped totals.</p>}<dl>{statChanges.map(({ key, label, before, after, delta }) => <div key={key}><dt>{label}</dt><dd className={delta < 0 ? "ab-negative" : delta === 0 ? "ab-unchanged" : undefined}>{delta > 0 ? "+" : ""}{delta}<small>Equipped {before}<br />New {after}</small></dd></div>)}</dl>{statChanges.length === 0 && <p>No scored stat changes.</p>}</section>
      {result.sockets.length > 0 && <div className="ab-loadout-diff-legend"><div><h3>Equipment changes</h3><p>Compared with the character’s equipped snapshot, socket by socket.</p></div><div><span className="is-remove"><Minus size={13} aria-hidden="true" /> Remove</span><span className="is-add"><Plus size={13} aria-hidden="true" /> Add</span><span><Check size={13} aria-hidden="true" /> Keep</span></div></div>}
      {result.sockets.length === 0 && <p className="ab-empty">This equipment snapshot has no visible augment sockets.</p>}
      {result.plan.character?.equipment.map((gear) => {
        const sockets = result.sockets.filter((socket) => socket.slotId === gear.slotId);
        if (!sockets.length) return null;
        return <section className="ab-loadout-gear" key={gear.slotId}><header><ItemIcon icon={gear.icon} name={gear.name} size="sm" /><div><h3>{equipmentSlots[gear.slotId].label}</h3><a className="ab-loadout-item-link" href={`/items/${gear.id}`} target="_blank" rel="noopener noreferrer" title="Open item in a new tab">{gear.name}<ExternalLink size={12} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></div><span>{sockets.filter((socket) => socket.itemId).length} / {sockets.length}</span></header><div>{sockets.map((socket) => {
          const item = socket.itemId ? items.get(socket.itemId) : undefined;
          const equipped = gear.sockets.find((entry) => entry.index === socket.socketIndex);
          const current = equipped?.installedAugmentId ? items.get(equipped.installedAugmentId) : undefined;
          const occupied = Boolean(equipped?.installedAugmentId || equipped?.unavailable);
          const unchanged = Boolean(item && equipped?.installedAugmentId === item.id);
          return <div className={`ab-loadout-socket ${item ? "" : "needs-review"}`} key={socket.key}>
            <header><span>Socket {socket.socketIndex}<small>Type {socket.type}</small></span><span>{unchanged ? "Unchanged" : !item ? "Needs review" : occupied ? "Replace augment" : "Fill empty socket"}</span></header>
            {unchanged ? <LoadoutDiffRow action="keep" item={item} /> : <>
              {occupied && <LoadoutDiffRow action="remove" item={current} fallback={equipped?.unavailable ? "Undiscovered equipped augment" : "Unavailable equipped augment"} />}
              {item && <LoadoutDiffRow action="add" item={item} />}
              {!item && <div className="ab-loadout-diff-empty"><strong>{occupied ? "Left empty in this loadout" : "Remains empty"}</strong><p>{socket.reason ? reasons[socket.reason] : "Choose an augment"}</p></div>}
            </>}
          </div>;
        })}</div></section>;
      })}
    </div>
    <footer className="ab-rec-footer ab-loadout-footer"><div><p>Replaces every augment selection in your plan. Your equipment snapshot and owned counts stay intact.</p><small>Maximizes the selected weighted raw stats, counting augment haste once. Spell effects, stat caps, level scaling, and haste from equipment are not scored. This is a stat-based loadout, not a DPS simulation. Existing wish-list items remain on your acquisition list.</small></div><button disabled={!planned} onClick={onApply}><Check size={15} /> Apply loadout</button></footer>
  </div></dialog>;
}

export function ArchetypeOptimizer({ plan, items, onApply }: { plan: BenchPlan; items: ReadonlyMap<number, BenchItem>; onApply: (plan: BenchPlan, role: string) => void }) {
  const [role, setRole] = useState<Archetype>(plan.optimization?.archetype ?? "tank");
  const preset = archetypes.find((entry) => entry.id === role) ?? archetypes[0];
  const [weights, setWeights] = useState<StatWeights>(() => resolveArchetypeWeights(preset, plan.optimization?.weights));
  const [state, setState] = useState<Generation>({ kind: "idle" });
  const workerRef = useRef<Worker | null>(null);
  function cancel() { workerRef.current?.terminate(); workerRef.current = null; setState({ kind: "idle" }); }
  useEffect(() => {
    const savedRole = plan.optimization?.archetype ?? "tank";
    const savedPreset = archetypes.find((entry) => entry.id === savedRole) ?? archetypes[0];
    setRole(savedRole);
    setWeights(resolveArchetypeWeights(savedPreset, plan.optimization?.weights));
  }, [plan.character, plan.optimization]);
  useEffect(() => {
    setState({ kind: "idle" });
    return () => { workerRef.current?.terminate(); workerRef.current = null; };
  }, [plan, items]);
  function generate() {
    workerRef.current?.terminate(); setState({ kind: "working" });
    try {
      const worker = new Worker(new URL("./optimizer.worker.ts", import.meta.url)); workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<Exclude<Generation, { kind: "idle" } | { kind: "working" }>>) => { if (workerRef.current !== worker) return; setState(event.data); worker.terminate(); workerRef.current = null; };
      worker.onerror = () => { if (workerRef.current !== worker) return; setState({ kind: "error", message: "Could not generate the loadout. Please retry." }); worker.terminate(); workerRef.current = null; };
      worker.postMessage({ plan, items: [...items.values()], weights });
    } catch { setState({ kind: "error", message: "Your browser could not start the optimizer. Please retry." }); }
  }
  return <section className="ab-optimizer" aria-label="Archetype loadout optimizer"><div className="ab-section-heading"><h3><Sparkles size={16} /> Build for a role</h3><span>FULL LOADOUT</span></div><p>Start fresh from this character’s gear. Equipped augments do not influence the picks.</p>
    <div className="ab-archetypes" role="group" aria-label="Build archetype">{archetypes.map((entry) => { const Icon = icons[entry.id]; return <button key={entry.id} aria-pressed={entry.id === role} onClick={() => { cancel(); setRole(entry.id); setWeights({ ...entry.weights }); }}><Icon size={16} />{entry.label}</button>; })}</div>
    <p className="ab-role-description">{preset.description}</p>
    <details className="ab-optimizer-weights"><summary>Scoring & stat weights</summary><p>Preset weights express a preference, not measured combat effectiveness. Each point of a stat earns its weight. Edit them for your build.</p><div>{Object.entries(weights).map(([key, value]) => <label key={key}>{augmentStats.find((stat) => stat.key === key)?.label ?? key}<input aria-label={`Weight for ${augmentStats.find((stat) => stat.key === key)?.label ?? key}`} type="number" min={0} max={1000} step="any" value={value} onChange={(event) => { cancel(); setWeights({ ...weights, [key]: Math.max(0, Math.min(1000, Number(event.target.value) || 0)) }); }} /></label>)}</div><label>Add a statistic<select value="" onChange={(event) => { if (event.target.value) { cancel(); setWeights({ ...weights, [event.target.value]: 1 }); } }}><option value="">Choose a statistic</option>{recommendationPriorities.filter((stat) => !(stat.key in weights)).map((stat) => <option key={stat.key} value={stat.key}>{stat.label}</option>)}</select></label><p>Only discovered augments that fit your character and equipment are eligible. Lore is enforced across the full loadout. Spell effects and conditional bonuses require manual review.</p></details>
    <div className="ab-optimizer-actions"><button disabled={state.kind === "working" || !plan.character} onClick={generate}><Sparkles size={15} />{state.kind === "working" ? "Optimizing all sockets…" : "Generate loadout"}</button>{state.kind === "working" && <button onClick={cancel}>Cancel</button>}</div>
    {state.kind === "working" && <p role="status">Allocating augments across your equipment. Your current plan is unchanged.</p>}{state.kind === "error" && <p role="alert" className="ab-negative">{state.message}</p>}
    {state.kind === "ready" && <LoadoutReview result={state.result} role={preset.label} items={items} onClose={cancel} onApply={() => { onApply({ ...state.result.plan, optimization: { archetype: role, weights } }, preset.label); cancel(); }} />}
  </section>;
}
