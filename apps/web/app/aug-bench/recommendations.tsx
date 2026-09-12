"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, Gem, Plus, Sparkles, X } from "lucide-react";
import { augmentMoveTargets, augmentStats, conditionalStatKeys, type BenchCharacterProfile, type BenchItem, type BenchPlan } from "@eq-alla/data/aug-bench";
import { recommendationPriorities, type AugmentRecommendation, type SocketRecommendations, type StatChange } from "@eq-alla/data/aug-recommendations";
import { ItemIcon } from "../../components/item-icon";

const signed = (value: number) => `${value > 0 ? "+" : ""}${value}`;

function Candidate({ candidate, rank, priority, level, onApply }: {
  candidate: AugmentRecommendation; rank: number; priority: string; level: number; onApply: () => void;
}) {
  const { item, changes, kind, gainedEffects, lostEffects } = candidate;
  // Include unchanged stats too: the primary figures describe the candidate,
  // while the comparison is always secondary and explicitly labeled.
  const stats = new Map<string, StatChange>();
  for (const { key, label } of recommendationPriorities) {
    const value = item.stats[key] ?? 0;
    if (value) stats.set(key, { key, label, before: value, after: value, delta: 0, unit: "" });
  }
  for (const bonus of item.bonuses) {
    const key = JSON.stringify([bonus.label, bonus.unit]);
    stats.set(key, { ...bonus, key, before: bonus.value, after: bonus.value, delta: 0 });
  }
  for (const change of changes) stats.set(change.key, change);
  const sorted = [...stats.values()].sort((a, b) => Number(b.key === priority) - Number(a.key === priority) || Number(b.delta < 0) - Number(a.delta < 0) || Number(b.delta !== 0) - Number(a.delta !== 0));
  const difference = (change: StatChange) => change.delta === 0 ? "No change" : `${signed(change.delta)}${change.unit} ${change.delta > 0 ? "gain" : "loss"}`;
  const label = kind === "fill" ? "Fill empty socket" : kind === "upgrade" ? "Gains without raw stat losses" : kind === "tradeoff" ? "Priority gain · review tradeoffs" : "Compatible alternative";
  return <article className={`ab-recommendation ab-recommendation-${kind}`}>
    <span className="ab-rec-rank" aria-label={`Rank ${rank}`}>#{rank}</span>
    <div className="ab-rec-item"><ItemIcon icon={item.icon} name={item.name} /><div><span className="ab-rec-reason">{label}</span><h4><Link href={`/items/${item.id}`} target="_blank">{item.name}</Link></h4></div></div>
    {sorted.length > 0 && <><p className="ab-rec-stat-heading">This augment provides</p><dl className="ab-rec-deltas">{sorted.slice(0, 4).map((change) => <div key={change.key} className={change.delta < 0 ? "is-loss" : ""}><dt>{change.label}</dt><dd><span className={`ab-rec-total ${change.after < 0 ? "ab-negative" : ""}`}>{change.after}{change.unit}</span><span className={`ab-rec-change ${change.delta === 0 ? "is-unchanged" : ""}`}>{difference(change)}</span><small>Current: {change.before}{change.unit}</small></dd></div>)}</dl></>}
    {!sorted.length && <p className="ab-rec-neutral">No raw stats{gainedEffects.length || lostEffects.length ? " · compare effects below" : " · appearance or utility alternative"}.</p>}
    {sorted.length > 4 && <details className="ab-rec-more"><summary>All {sorted.length} stats & comparisons</summary><dl>{sorted.map((change) => <div key={change.key}><dt>{change.label}</dt><dd><strong className={change.after < 0 ? "ab-negative" : "ab-contribution-value"}>{change.after}{change.unit} total</strong><small className={change.delta < 0 ? "ab-negative" : change.delta > 0 ? "ab-contribution-value" : ""}>{difference(change)} · Current: {change.before}{change.unit}</small></dd></div>)}</dl></details>}
    {(gainedEffects.length > 0 || lostEffects.length > 0) && <div className="ab-rec-effects">{gainedEffects.map((effect) => <p key={`gain-${effect.kind}-${effect.id}`}><Plus size={13} /><span>Adds {effect.kind}: <Link href={`/spells/${effect.id}`} target="_blank">{effect.name}</Link></span></p>)}{lostEffects.map((effect) => <p className="ab-negative" key={`loss-${effect.kind}-${effect.id}`}><X size={13} /><span>Removes {effect.kind}: <Link href={`/spells/${effect.id}`} target="_blank">{effect.name}</Link></span></p>)}</div>}
    {item.recommendedLevel > level && <p className="ab-rec-scaling">Recommended level {item.recommendedLevel} · values scale down at your level.</p>}
    <footer><span className={candidate.availableOwned ? "ab-contribution-value" : ""}>{candidate.availableOwned ? <><Check size={13} /> Owned copy available</> : "Need to acquire"}<small>{item.tradeable ? "Tradeable" : "No drop"}{item.loreGroup !== 0 && " · Lore"}</small></span><button onClick={onApply}><Plus size={14} /> {kind === "fill" ? "Plan augment" : "Plan replacement"}</button></footer>
  </article>;
}

export function Recommendations({ gear, position, sockets, initialSocketIndex, plan, items, priority, onPriority, onApply, onRemove, onMove, onClose }: {
  gear: BenchCharacterProfile["equipment"][number]; position: string; sockets: SocketRecommendations[];
  initialSocketIndex?: number;
  plan: BenchPlan; items: ReadonlyMap<number, BenchItem>; priority: string; onPriority: (value: string) => void;
  onApply: (item: BenchItem, socket: SocketRecommendations) => void; onClose: () => void;
  onRemove: (key: string) => void;
  onMove: (item: BenchItem, sourceKey: string, destination: { slotId: number; socketIndex: number }) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [socketIndex, setSocketIndex] = useState(() => initialSocketIndex ?? sockets.find((socket) => !socket.current && socket.candidates.length)?.index
    ?? sockets.find((socket) => socket.candidates.some((candidate) => candidate.recommended))?.index ?? sockets[0]?.index);
  const [showAll, setShowAll] = useState(false);
  const [limit, setLimit] = useState(6);
  const [message, setMessage] = useState("");
  const [showMove, setShowMove] = useState(false);
  const [moveKey, setMoveKey] = useState("");
  const statusRef = useRef<HTMLParagraphElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const socket = sockets.find((entry) => entry.index === socketIndex);
  const installedSocket = gear.sockets.find((entry) => entry.index === socketIndex);
  const installedId = installedSocket?.installedAugmentId;
  const installed = installedId ? items.get(installedId) : undefined;
  const candidates = socket?.candidates.filter((candidate) => showAll || candidate.recommended) ?? [];
  const suggestedCount = socket?.candidates.filter((candidate) => candidate.recommended).length ?? 0;
  const moveTargets = socket?.current && !socket.blocked ? augmentMoveTargets(plan, items, socket.key) : [];
  const moveDestination = moveTargets.find((entry) => entry.key === moveKey);
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => { setLimit(6); resultsRef.current?.scrollTo({ top: 0 }); }, [socketIndex, priority, showAll]);
  useEffect(() => { setShowMove(false); setMoveKey(""); }, [socketIndex, socket?.current?.id]);
  return <dialog ref={dialogRef} className="ab-recommendations-dialog" aria-labelledby={titleId} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="ab-rec-shell">
      <header className="ab-rec-header"><div><p className="ab-eyebrow"><Sparkles size={14} /> SOCKET ADVISOR</p><h2 id={titleId}>{position}<span> / Augment opportunities</span></h2><Link className="ab-rec-gear" href={`/items/${gear.id}`} target="_blank"><ItemIcon icon={gear.icon} name={gear.name} size="sm" />{gear.name}</Link></div><button autoFocus aria-label="Close recommendations" onClick={onClose}><X size={20} /></button></header>
      <div className="ab-rec-controls"><div className="ab-rec-sockets" role="group" aria-label="Equipment sockets">{sockets.map((entry) => {
        const count = entry.candidates.filter((candidate) => candidate.recommended).length;
        return <button key={entry.key} aria-pressed={entry.index === socketIndex} onClick={() => { setSocketIndex(entry.index); setMessage(""); }}><span>Socket {entry.index}<small>Type {entry.type}</small></span><span className={`ab-rec-socket-state ${count ? "has-suggestions" : ""}`}>{entry.blocked ? "Unavailable" : !entry.current ? "Empty" : "Filled"}{count > 0 && <Sparkles size={12} />}</span></button>;
      })}</div><label>Prioritize<select aria-label="Recommendation priority" value={priority} onChange={(event) => onPriority(event.target.value)}>{recommendationPriorities.map((stat) => <option key={stat.key} value={stat.key}>{stat.label}</option>)}</select></label></div>
      <div className="ab-rec-content" ref={resultsRef}>
        {!socket ? <div className="ab-empty"><Gem size={28} /><h3>No augment sockets</h3><p>This equipment has no visible augment sockets.</p></div> : socket.blocked ? <div className="ab-empty"><Gem size={28} /><h3>This socket is occupied</h3><p>Its augment is not in the discovered catalog, so recommendations for this socket are unavailable.</p></div> : <>
          <section className="ab-rec-baseline" aria-label="Current socket augment"><div><span className="ab-rec-kicker">{socket.current ? "IN YOUR PLAN" : "ROOM TO GROW"}</span><h3>{socket.current?.name ?? "An empty socket. A new opportunity."}</h3>{(installed?.id ?? null) !== (socket.current?.id ?? null) && <p>Equipped snapshot: {installedSocket?.unavailable ? "Undiscovered augment" : installed?.name ?? "Empty socket"}</p>}{socket.current && <p>{[...augmentStats.filter(({ key }) => socket.current?.stats[key] && !conditionalStatKeys.has(key)).map(({ key, label }) => `${signed(socket.current?.stats[key] ?? 0)} ${label}`), ...socket.current.bonuses.map((bonus) => `${signed(bonus.value)}${bonus.unit} ${bonus.label}`)].join(" · ") || "Appearance / utility"}</p>}{socket.current?.effects.map((effect) => <p key={`${effect.kind}:${effect.id}`}>{effect.kind}: <Link href={`/spells/${effect.id}`} target="_blank">{effect.name}</Link></p>)}{socket.current && socket.current.recommendedLevel > plan.level && <p>Current augment also scales down below level {socket.current.recommendedLevel}.</p>}</div>{socket.current ? <ItemIcon icon={socket.current.icon} name={socket.current.name} /> : <Gem size={34} />}</section>
          {socket.current && <div className="ab-rec-manage"><button aria-expanded={showMove} onClick={() => setShowMove(!showMove)}>Move augment</button><button onClick={() => { onRemove(socket.key); setMessage(`Augment removed from socket ${socket.index}. Your owned quantity is unchanged.`); requestAnimationFrame(() => statusRef.current?.focus()); }}>Remove from plan</button>
            {showMove && (moveTargets.length ? <form onSubmit={(event) => { event.preventDefault(); if (socket.current && moveDestination) onMove(socket.current, socket.key, moveDestination); }}><label>Move to an empty socket<select aria-label="Move augment destination" value={moveKey} onChange={(event) => setMoveKey(event.target.value)}><option value="">Choose a compatible socket</option>{moveTargets.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}</select></label><button type="submit" disabled={!moveDestination}>Move here</button></form> : <p>No compatible empty sockets. Socket type, equipment restrictions, and lore are checked before moving.</p>)}
          </div>}
          <div className="ab-rec-results-heading"><div><h3>{showAll ? "Compatible alternatives" : "Suggested for this socket"}</h3><p>{candidates.length} discovered {candidates.length === 1 ? "option" : "options"} · lore & equipment requirements checked</p></div><button aria-pressed={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? `Suggestions (${suggestedCount})` : `All compatible (${socket.candidates.length})`}</button></div>
          {!candidates.length && <div className="ab-empty"><Check size={28} /><h3>{socket.candidates.length ? "No suggested improvement for this priority" : "No compatible alternatives discovered"}</h3><p>{socket.candidates.length ? "Try another priority or explore all compatible alternatives." : "Socket type, equipment restrictions, class, race, level, and lore all affect what fits."}</p></div>}
          <div className="ab-rec-candidates">{candidates.slice(0, limit).map((candidate, index) => <Candidate key={candidate.item.id} candidate={candidate} rank={index + 1} priority={priority} level={plan.level} onApply={() => { onApply(candidate.item, socket); setMessage(`${candidate.item.name} planned in socket ${socket.index}. Your acquisition list is updated.`); requestAnimationFrame(() => statusRef.current?.focus()); }} />)}</div>
          {candidates.length > limit && <button className="ab-rec-load-more" onClick={() => setLimit(limit + 6)}>Show more options · {candidates.length - limit} remaining</button>}
        </>}
      </div>
      <footer className="ab-rec-footer"><p ref={statusRef} tabIndex={-1} role="status" aria-live="polite">{message || "Plan one socket at a time. Suggestions update as your plan changes."}</p><small>Raw per-socket changes; level scaling, stat caps, haste stacking, and spell stacking are not modeled. Planning does not change your character.</small></footer>
    </div>
  </dialog>;
}
