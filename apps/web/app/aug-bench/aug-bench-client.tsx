"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowDownUp, Check, ChevronLeft, ChevronRight, Download, Gem, LayoutGrid, List, Plus, RotateCcw, Search, ShoppingBag, SlidersHorizontal, Sparkles, Upload, X } from "lucide-react";
import { itemClassNames, itemRaceFilterOptions } from "@eq-alla/data/item-search-filters";
import {
  acquisitionList, augmentStats, augmentTotals, planningAugmentTypes, benchCatalogSchema, benchPlanSchema,
  conditionalStatKeys, emptyBenchPlan, equipmentSlots, fitsPosition, isPlanningAugment, nextPlanKey, placementProblem,
  matchingSockets, placementSocket, planFromCharacter, restrictionLabels, wearableBy, withoutOrnamentation, type BenchItem, type BenchPlan
} from "@eq-alla/data/aug-bench";
import { ItemIcon } from "../../components/item-icon";
import { CharacterPicker } from "./character-picker";
import { recommendAugments } from "@eq-alla/data/aug-recommendations";
import { Recommendations } from "./recommendations";
import { ArchetypeOptimizer } from "./archetype-optimizer";

const storageKey = "eq-alla:aug-bench:v1";
type CatalogState = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; items: BenchItem[]; retrievedAt: string };
type Target = { slotId: number; replacingKey?: string; socketIndex?: number };
const categories = [...new Set(augmentStats.map((stat) => stat.category)), "Effects"];
const pageSize = 20;

async function readJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const timeout = AbortSignal.timeout(20_000);
  const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  if (!response.ok) throw new Error("The server item database could not be reached. Please retry.");
  return response.json();
}

function statSummary(item: BenchItem) {
  return [...augmentStats.filter(({ key }) => item.stats[key] && !conditionalStatKeys.has(key))
    .map(({ key, label }) => `${item.stats[key] > 0 ? "+" : ""}${item.stats[key]} ${label}`),
    ...item.bonuses.map((bonus) => `${bonus.value > 0 ? "+" : ""}${bonus.value}${bonus.unit} ${bonus.label}`)
  ].slice(0, 5).join(" · ") || (item.effects.length ? "Spell effects" : "Utility");
}

function CardStats({ item, priority, onDetails }: { item: BenchItem; priority: string; onDetails: () => void }) {
  const stats = [
    ...augmentStats.filter(({ key }) => item.stats[key] && !conditionalStatKeys.has(key))
      .map(({ key, label }) => ({ key, label, value: item.stats[key], unit: "" })),
    ...item.bonuses.map((bonus, index) => ({ ...bonus, key: `bonus-${index}` }))
  ].sort((a, b) => Number(b.key === priority) - Number(a.key === priority));
  const lead = stats[0];
  const supporting = stats.slice(1, 3);
  const remaining = Math.max(0, stats.length - 3);
  return <div className="ab-card-benefits">
    {lead ? <>
      <dl><div><dt title={lead.label}>{lead.label}</dt><dd className={lead.value < 0 ? "ab-negative" : "ab-contribution-value"}>{lead.value > 0 ? "+" : ""}{lead.value}{lead.unit}</dd></div></dl>
      {supporting.length > 0 && <p className="ab-supporting-stats" title={supporting.map((stat) => `${stat.value > 0 ? "+" : ""}${stat.value}${stat.unit} ${stat.label}`).join(" · ")}>{supporting.map((stat, index) => <span key={stat.key}>{index > 0 && " · "}<strong className={stat.value < 0 ? "ab-negative" : "ab-contribution-value"}>{stat.value > 0 ? "+" : ""}{stat.value}{stat.unit}</strong> {stat.label}</span>)}</p>}
    </> : <div className="ab-card-utility"><Sparkles size={20} /><span>{item.effects.length ? item.effects[0].name : "Utility"}</span></div>}
    {(remaining > 0 || (stats.length > 0 && item.effects.length > 0)) && <button className="ab-more-stats" onClick={onDetails}>View {remaining > 0 ? `${remaining} more stats` : "spell effects"}{remaining > 0 && item.effects.length > 0 ? " & effects" : ""}</button>}
  </div>;
}

function itemCategories(item: BenchItem) {
  return categories.filter((category) => category === "Effects" ? item.effects.length > 0
    : augmentStats.some((stat) => stat.category === category && (item.stats[stat.key] ?? 0) > 0));
}

function EquipmentFigure() {
  return <svg className="ab-figure" viewBox="0 0 180 450" fill="none" aria-hidden="true">
    <path d="M90 4v442M12 95h156M12 225h156M12 355h156" stroke="currentColor" strokeOpacity=".13" strokeDasharray="2 7" />
    <circle cx="90" cy="208" r="78" stroke="currentColor" strokeOpacity=".14" />
    <path d="m74 39 16-8 16 8 7 28-12 18H79L67 67Zm5 51-24 11-13 42 17 14 5-36 4 77 22 15 22-15 4-77 5 36 17-14-13-42-24-11ZM40 150l-12 67 13 7 18-63m62 0 18 63 13-7-12-67M67 210l-3 55 6 53 17-1 3-71 3 71 17 1 6-53-3-55ZM70 329l-4 50-15 21 34-1 2-70m6 0 2 70 34 1-15-21-4-50" fill="currentColor" fillOpacity=".08" stroke="currentColor" strokeOpacity=".4" />
    <path d="m90 108 17 10-3 54-14 14-14-14-3-54ZM76 52l14 6 14-6M90 58v15M68 198h44M67 265l20 8m6 0 20-8" stroke="currentColor" strokeOpacity=".45" />
    <path d="m90 202 7 7-7 7-7-7Z" fill="currentColor" />
  </svg>;
}

// Empty-slot silhouettes keep the inventory readable before any augments are placed.
const slotGlyphs: Record<number, string> = {
  0: "m12 3 7 9-7 9-7-9Z M8 12h8",
  1: "M15 5a6 6 0 1 0 0 12 M15 5v4 M15 17v3",
  2: "M5 18V10a7 7 0 0 1 14 0v8l-5 3v-8h-4v8Z M5 11h14",
  3: "M3 8h18l-2 8-7 3-7-3Z M7 11l3 1 M14 12l3-1",
  4: "M9 5a6 6 0 1 1 0 12 M9 5v4 M9 17v3",
  5: "M4 4v5a8 8 0 0 0 16 0V4 M12 17l-3 3 3 2 3-2Z",
  6: "M2 12l4-7 6 3 6-3 4 7-5 3-5-4-5 4Z",
  7: "m5 4 6 2-3 15-6-2Z m8 2 6-2 3 15-6 2Z",
  8: "m8 3-5 18h18L16 3l-4 3Z M12 6v12",
  9: "m5 5 14 3-2 12-14-3Z M7 6l-2 11 M17 8l-2 11",
  10: "m5 5 14 3-2 12-14-3Z M7 6l-2 11 M17 8l-2 11",
  11: "M6 3q17 9 0 18L12 12Z M3 12h18 m-3-3 3 3-3 3",
  12: "M7 21 4 12l2-2 3 4V5l2-1 1 7V3h2l1 8V5h2l1 8 2-5 2 1-3 12Z",
  13: "m16 3 5-1-1 5L9 18l-3-3Z M4 13l7 7 M3 21l4-4",
  14: "m12 2 9 4-2 10-7 6-7-6L3 6Z M12 6v12",
  15: "M7 8a7 7 0 1 0 10 0 M8 5l4-3 4 3-4 5Z",
  16: "M7 8a7 7 0 1 0 10 0 M8 5l4-3 4 3-4 5Z",
  17: "m8 3-5 3 2 6 3-1v10h8V11l3 1 2-6-5-3-4 3Z",
  18: "M6 3h12l2 18h-6l-2-11-2 11H4Z M6 7h12",
  19: "M6 3h9v11l5 3v4H4V11h2Z M4 17h11",
  20: "M2 8h20v8H2Z M9 7h6v10H9Z M11 12h5",
  21: "m13 2-8 12h6l-1 8 9-13h-7Z",
  22: "M5 21 19 3 M13 4l6-1-1 6 M4 15l5 5 M7 12l5 5",
};

function SlotGlyph({ slotId }: { slotId: number }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={slotGlyphs[slotId]} /></svg>;
}

function AugmentDetails({ modal, name, onClose, children }: { modal: boolean; name: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (modal) dialogRef.current?.showModal();
  }, [modal]);
  if (!modal) return <div className="ab-augment-details">{children}</div>;
  return <dialog ref={dialogRef} className="ab-detail-dialog" aria-label={`${name} details`} onClose={onClose}>
    <header><h3>{name}</h3><button aria-label="Close augment details" onClick={() => dialogRef.current?.close()}><X size={18} /></button></header>
    <div className="ab-augment-details">{children}</div>
  </dialog>;
}

export function AugBench() {
  const [catalog, setCatalog] = useState<CatalogState>({ kind: "loading" });
  const [planState, setPlan] = useState<BenchPlan>(emptyBenchPlan);
  const plan = useMemo(() => withoutOrnamentation(planState, catalog.kind === "ready" ? catalog.items : []), [planState, catalog]);
  useEffect(() => {
    if (plan !== planState) setPlan(plan);
  }, [plan, planState]);
  const [previous, setPrevious] = useState<BenchPlan | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [storageMessage, setStorageMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [target, setTarget] = useState<Target | null>(null);
  const [tab, setTab] = useState<"catalog" | "acquire">("catalog");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [benefit, setBenefit] = useState("");
  const [minimum, setMinimum] = useState(1);
  const [type, setType] = useState("");
  const [trade, setTrade] = useState("");
  const [ownership, setOwnership] = useState("");
  const [sort, setSort] = useState("name");
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [catalogView, setCatalogView] = useState<"compact" | "grid">("grid");
  const [equipmentView, setEquipmentView] = useState<"equipment" | "augments">("augments");
  const [recommendationSlot, setRecommendationSlot] = useState<number | null>(null);
  const [recommendationPriority, setRecommendationPriority] = useState("hp");
  const [movingFrom, setMovingFrom] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setPlan(benchPlanSchema.parse(JSON.parse(raw)));
    } catch {
      setStorageMessage("Your saved plan could not be read. Export your work before leaving this browser.");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setCatalog({ kind: "loading" });
    async function load() {
      try {
        const data = benchCatalogSchema.parse(await readJson("/api/aug-bench", controller.signal));
        if (controller.signal.aborted) return;
        setTarget(null); setRecommendationSlot(null);
        setMovingFrom(null);
        setCatalog({ kind: "ready", items: data.data, retrievedAt: data.retrievedAt });
      } catch {
        if (!controller.signal.aborted) setCatalog({ kind: "error", message: "The server item database could not be reached. Please retry." });
      }
    }
    void load();
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (catalog.kind !== "ready") return;
    try { localStorage.setItem(storageKey, JSON.stringify(plan)); }
    catch { setStorageMessage("Browser storage is unavailable. Export your plan to keep it."); }
  }, [plan, catalog.kind]);

  useEffect(() => { setPage(0); }, [q, category, benefit, minimum, type, trade, ownership, sort, descending, target, plan.classBit, plan.raceBit, plan.level]);

  const augments = useMemo(() => catalog.kind === "ready" ? catalog.items.filter(isPlanningAugment) : [], [catalog]);
  const items = useMemo(() => new Map(augments.map((item) => [item.id, item])), [augments]);
  const recommendations = useMemo(() => recommendAugments(plan, items, recommendationPriority), [plan, items, recommendationPriority]);
  const recommendationGear = plan.character?.equipment.find((gear) => gear.slotId === recommendationSlot);
  const selectedSlot = target?.slotId ?? null;
  const selectedLabel = equipmentSlots.find((slot) => slot.id === selectedSlot)?.label ?? "All positions";
  const selectedAugment = target?.replacingKey ? items.get(plan.augments[target.replacingKey]) : undefined;
  const selectedGear = plan.character?.equipment.find((gear) => gear.slotId === selectedSlot);
  const profileSockets = plan.character?.equipment.flatMap((gear) => gear.sockets.filter((socket) => socket.visible).map((socket) => ({ ...socket, key: `${gear.slotId}:${socket.index}` }))) ?? [];
  const openSockets = profileSockets.filter((socket) => (!socket.unavailable || plan.ignoreEquippedAugments) && !plan.augments[socket.key]).length;
  const acquisitions = acquisitionList(plan, items);
  const missing = acquisitions.reduce((sum, entry) => sum + entry.missing, 0);
  const validAugments: BenchItem[] = [];
  const validPositions = new Set<number>();
  const problems: { key: string; message: string }[] = [];
  for (const [key, id] of Object.entries(plan.augments)) {
    const slotId = Number(key.split(":")[0]);
    const augment = items.get(id);
    const problem = augment ? placementProblem({ augment, slotId, replacingKey: key, plan, items }) : "Augment is no longer available in the discovered catalog.";
    if (problem) problems.push({ key, message: `${equipmentSlots[slotId]?.label}: ${problem}` });
    else if (augment) { validAugments.push(augment); validPositions.add(slotId); }
  }
  const totals = augmentTotals(validAugments);
  const compatibleProblem = (augment: BenchItem) => target
    ? placementProblem({ augment, ...target, plan, items, movingFrom: movingFrom ?? undefined }) : null;
  const filtered = augments.filter((item) => {
    const benefits = augmentStats.filter(({ key }) => item.stats[key]).map(({ label }) => label).join(" ");
    const text = `${item.name} ${item.id} ${item.source} ${benefits} ${item.bonuses.map((bonus) => bonus.label).join(" ")} ${item.effects.map((effect) => effect.name).join(" ")}`.toLowerCase();
    return (!q || text.includes(q.toLowerCase())) && wearableBy(item, plan)
      && (!category || itemCategories(item).includes(category))
      && (!benefit || (item.stats[benefit] ?? 0) >= minimum)
      && (!type || planningAugmentTypes(item.augType).includes(Number(type)))
      && (!target || fitsPosition(item, target.slotId))
      && (!target || !plan.character || matchingSockets(item, target.slotId, plan, target.replacingKey ? Number(target.replacingKey.split(":")[1]) : target.socketIndex).length > 0)
      && (!trade || item.tradeable === (trade === "tradeable"))
      && (!ownership || (ownership === "owned" ? (plan.owned[item.id] ?? 0) > 0 : acquisitions.some((entry) => entry.item.id === item.id && entry.missing > 0)));
  }).sort((a, b) => {
    const result = sort === "name" ? a.name.localeCompare(b.name)
      : sort === "category" ? itemCategories(a).join().localeCompare(itemCategories(b).join())
        : (a.stats[sort] ?? 0) - (b.stats[sort] ?? 0);
    return (descending ? -result : result) || a.name.localeCompare(b.name) || a.id - b.id;
  });
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1));
  const pageItems = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  useEffect(() => {
    resultsRef.current?.scrollTo({ top: 0 });
  }, [currentPage, catalogView, q, category, benefit, minimum, type, trade, ownership, sort, descending, target, plan.classBit, plan.raceBit, plan.level]);

  function change(next: BenchPlan, message?: string) {
    setPrevious(plan);
    setPlan(next);
    if (message) setNotice(message);
  }
  function chooseSlot(slotId: number) {
    setTarget({ slotId }); setTab("catalog");
    if (window.matchMedia("(max-width: 760px)").matches) {
      requestAnimationFrame(() => document.getElementById("bench-catalog")?.scrollIntoView({ block: "start", behavior: "instant" }));
    }
  }
  function place(augment: BenchItem, destination = target, source: string | null = null) {
    if (!destination) { setNotice("Select an equipment position first, or add the augment to your acquisition list."); return; }
    if (source && plan.augments[source] !== augment.id) { setNotice("That planned augment has changed. Select it again to move it."); return; }
    const problem = placementProblem({ augment, ...destination, plan, items, movingFrom: source ?? undefined });
    if (problem) { setNotice(problem); return; }
    const next = { ...plan.augments };
    if (source) delete next[source];
    const socket = plan.character ? placementSocket(augment, destination.slotId, plan, destination.replacingKey, destination.socketIndex, source ?? undefined) : undefined;
    const key = socket ? `${destination.slotId}:${socket.index}` : destination.replacingKey ?? nextPlanKey({ ...plan, augments: next }, destination.slotId);
    next[key] = augment.id;
    change({ ...plan, augments: next }, `${augment.name} planned for ${equipmentSlots[destination.slotId]?.label}.`);
    setMovingFrom(null); setTarget({ slotId: destination.slotId });
  }
  function removeAugment(key: string) {
    const next = { ...plan.augments }; delete next[key];
    change({ ...plan, augments: next }, "Augment removed. Your owned quantity is unchanged.");
    setMovingFrom(null);
    if (target?.replacingKey === key) setTarget({ slotId: target.slotId });
  }
  function exportFile(contents: string, name: string, mime: string) {
    const url = URL.createObjectURL(new Blob([contents], { type: mime }));
    const link = document.createElement("a"); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importPlan(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100_000) throw new Error("Plan files must be smaller than 100 KB.");
      const imported = benchPlanSchema.parse(JSON.parse(await file.text()));
      change(imported, "Plan imported and checked against the discovered catalog. Undo is available.");
      setTarget(null); setRecommendationSlot(null); setMovingFrom(null);
    } catch { setNotice("Could not import this plan. Check the plan file, then retry. Your current plan is unchanged."); }
    if (importRef.current) importRef.current.value = "";
  }

  if (catalog.kind !== "ready") return <div className="aug-bench ab-loading">
    <Gem size={38} /><h1>Aug Bench</h1>
    {catalog.kind === "loading" ? <p role="status">Loading discovered augments and your saved build…</p> : <><p role="alert">{catalog.message}</p><button onClick={() => setRefresh((n) => n + 1)}>Retry database connection</button></>}
  </div>;

  return <div className="aug-bench">
    <header className="ab-header">
      <div><p className="ab-eyebrow"><Gem size={14} /> BUILD TOOLS / DISCOVERED ITEMS</p><h1>Aug Bench<span>.</span></h1><p>Plan augments by position and track the ones you still need.</p></div>
      <div className="ab-header-actions"><span className="ab-saved"><Check size={13} />{storageMessage ? "Export to save" : "Saved in this browser"}</span>
        <div><button onClick={() => { if (previous) { setPlan(previous); setPrevious(plan); setTarget(null); setRecommendationSlot(null); setMovingFrom(null); setExpanded(null); setNotice("Last change undone."); } }} disabled={!previous} title="Undo last change"><RotateCcw size={15} /> Undo</button>
          <button onClick={() => exportFile(JSON.stringify(plan, null, 2), "aug-bench-build.json", "application/json")}><Download size={15} /> Export</button>
          <button onClick={() => importRef.current?.click()}><Upload size={15} /> Import</button>
          <input hidden ref={importRef} type="file" accept=".json,application/json" aria-label="Import build file" onChange={(event) => void importPlan(event.target.files?.[0])} /></div>
      </div>
    </header>

    <section className="ab-build-bar" aria-label="Build settings">
      <label className="ab-build-name">Build name<input value={plan.name} maxLength={80} onChange={(event) => change({ ...plan, name: event.target.value })} /></label>
      <label>Class<select disabled={Boolean(plan.character)} value={plan.classBit} onChange={(event) => change({ ...plan, classBit: Number(event.target.value) })}><option value={0}>Any class</option>{itemClassNames.map((name, i) => <option key={name} value={2 ** i}>{name}</option>)}</select></label>
      <label>Race<select disabled={Boolean(plan.character)} value={plan.raceBit} onChange={(event) => change({ ...plan, raceBit: Number(event.target.value) })}><option value={0}>Any race</option>{itemRaceFilterOptions.map((name, i) => <option key={name} value={2 ** i}>{name}</option>)}</select></label>
      <label className="ab-level">Level<input type="number" min={1} max={255} disabled={Boolean(plan.character)} value={plan.level} onChange={(event) => change({ ...plan, level: Math.max(1, Math.min(255, Math.trunc(Number(event.target.value) || 1))) })} /></label>
      <div className="ab-build-status"><strong>{validPositions.size}<span> / {equipmentSlots.length}</span></strong><span>positions planned</span></div>
      <div className="ab-build-status"><strong>{missing}</strong><span>augments to acquire</span></div>
    </section>
    {storageMessage && <p className="ab-warning" role="alert">{storageMessage}</p>}
    <div className="ab-notice" role="status" aria-live="polite">{notice || "Select a position to browse its discovered augments, then add the ones you want to your plan."}</div>
    {problems.length > 0 && <details className="ab-warning"><summary>{problems.length} build conflicts. Invalid placements are excluded from totals.</summary><ul>{problems.map((problem) => <li key={problem.key}>{problem.message} <button onClick={() => removeAugment(problem.key)}>Remove</button></li>)}</ul></details>}

    <nav className="ab-mobile-jump" aria-label="Jump to workspace"><a href="#bench-equipment">Positions & augments</a><a href="#bench-catalog">Browse & acquire</a></nav>
    <div className="ab-workspace">
      <aside id="bench-equipment" className="ab-equipment" aria-label="Augment position planner">
        <div className="ab-section-heading"><div><p className="ab-eyebrow">YOUR AUGMENT PLAN</p><h2>Equipment positions</h2></div>
          <div className="ab-equipment-toggle" role="group" aria-label="Equipment viewer mode">
            <button disabled={!plan.character} title={!plan.character ? "Load a character first" : undefined} aria-pressed={Boolean(plan.character) && equipmentView === "equipment"} onClick={() => setEquipmentView("equipment")}>Equipment</button>
            <button aria-pressed={!plan.character || equipmentView === "augments"} onClick={() => setEquipmentView("augments")}>Augments</button>
          </div>
        </div>
        <CharacterPicker onLoad={(profile) => {
          change(planFromCharacter(profile), `Loaded ${profile.character.name}'s equipment. Your previous plan is available with Undo. Owned counts include equipped augments only.`);
          setEquipmentView("equipment"); setTarget(null); setRecommendationSlot(null); setMovingFrom(null); setExpanded(null); setTab("catalog");
          setQ(""); setCategory(""); setBenefit(""); setType(""); setTrade(""); setOwnership(""); setSort("name"); setDescending(false);
        }} />
        {plan.character && <div className="ab-character-summary"><strong>{plan.character.character.name}</strong><span>Level {plan.character.character.level} {itemClassNames[plan.character.character.classId - 1]} · {openSockets} / {profileSockets.length} sockets open</span>
          <small>Equipment snapshot {new Date(plan.character.retrievedAt).toLocaleString()} · Changes stay in this browser.</small>
          {plan.character.unavailableEquipment > 0 && <small>{plan.character.unavailableEquipment} equipment records could not be resolved.</small>}
          {profileSockets.some((socket) => socket.unavailable) && <small>{plan.ignoreEquippedAugments ? "Fresh loadout: original occupants are ignored in your plan. Equipment view retains the snapshot." : "Undiscovered augments stay hidden and their sockets remain occupied."}</small>}
          <button onClick={() => { change({ ...plan, character: undefined }, "Equipment constraints removed. Your augment plan is retained."); setEquipmentView("augments"); setTarget(null); setRecommendationSlot(null); }}>Use free planning</button>
        </div>}
        {plan.character && <ArchetypeOptimizer plan={plan} items={items} onApply={(next, role) => {
          change(next, `${role} loadout applied. Your previous plan is available with Undo.`);
          setEquipmentView("augments"); setTarget(null); setRecommendationSlot(null); setMovingFrom(null); setExpanded(null);
        }} />}
        <p className="ab-position-note">{plan.character && equipmentView === "augments" ? <span className="ab-advisor-hint"><Sparkles size={14} /> Tap a position for suggestions · prioritizing {augmentStats.find((stat) => stat.key === recommendationPriority)?.label}</span> : "Choose a slot to find its discovered augments."}</p>
        <div className={`ab-equipment-grid ${plan.character ? "has-character" : ""}`}>
          <EquipmentFigure />
          {equipmentSlots.map((slot) => {
            const entries = Object.entries(plan.augments).filter(([key]) => key.startsWith(`${slot.id}:`));
            const item = entries.length ? items.get(entries[0][1]) : undefined;
            const gear = plan.character?.equipment.find((entry) => entry.slotId === slot.id);
            const displayItem = plan.character && equipmentView === "equipment" ? gear : item;
            const sockets = gear?.sockets.filter((socket) => socket.visible) ?? [];
            const filled = sockets.filter((socket) => (equipmentView === "equipment" ? socket.unavailable || socket.installedAugmentId : (!plan.ignoreEquippedAugments && socket.unavailable) || plan.augments[`${slot.id}:${socket.index}`])).length;
            const badgeCount = plan.character ? filled : entries.length;
            const positionProblem = problems.some((entry) => entry.key.startsWith(`${slot.id}:`));
            const opportunities = recommendations.get(slot.id)?.filter((socket) => socket.candidates.some((candidate) => candidate.recommended)) ?? [];
            const suggestionCount = equipmentView === "augments" ? opportunities.length : 0;
            const emptyOpportunities = opportunities.filter((socket) => !socket.current).length;
            const suggestionLabel = `${suggestionCount} ${suggestionCount === 1 ? "socket has" : "sockets have"} suggestions${emptyOpportunities ? `, including ${emptyOpportunities} empty` : ""}`;
            const status = plan.character ? `${gear?.name ?? "No equipment"}, ${filled} of ${sockets.length} sockets filled` : positionProblem ? "needs review" : entries.length ? `${entries.length} planned` : "unplanned";
            return <div key={slot.id} className={`ab-position ab-position-${slot.id} ${slot.id === selectedSlot ? "is-selected" : ""} ${entries.length ? "is-planned" : ""} ${positionProblem ? "has-problem" : ""} ${plan.character && !gear ? "is-empty-equipment" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault(); const [id, fromSlot, fromEntry] = event.dataTransfer.getData("text/plain").split(":");
                const dropped = items.get(Number(id));
                if (dropped) place(dropped, { slotId: slot.id }, fromSlot !== undefined && fromEntry !== undefined ? `${fromSlot}:${fromEntry}` : null);
              }}>
              <button className="ab-position-button" aria-pressed={slot.id === selectedSlot} aria-haspopup={plan.character && equipmentView === "augments" && gear ? "dialog" : undefined} aria-label={`${slot.label}: ${status}${suggestionCount ? `. ${suggestionLabel}` : ""}`} title={`${slot.label}: ${status}${suggestionCount ? `. ${suggestionLabel}` : ""}`} onClick={() => {
                if (plan.character && equipmentView === "augments" && gear) { setTarget({ slotId: slot.id }); setMovingFrom(null); setRecommendationSlot(slot.id); }
                else chooseSlot(slot.id);
              }}>
                <span className="ab-gear-icon">{displayItem ? <ItemIcon icon={displayItem.icon} name={displayItem.name} size="sm" /> : <SlotGlyph slotId={slot.id} />}</span>
                <small>{slot.label}</small>
                {plan.character && <span className="ab-socket-dots" aria-hidden="true">{sockets.map((socket) => <i key={socket.index} className={(equipmentView === "equipment" ? socket.unavailable || socket.installedAugmentId : (!plan.ignoreEquippedAugments && socket.unavailable) || plan.augments[`${slot.id}:${socket.index}`]) ? "filled" : ""} />)}</span>}
                {(positionProblem || badgeCount > 0) && <strong className="ab-position-count" aria-hidden="true">{positionProblem ? "!" : badgeCount}</strong>}
                {suggestionCount > 0 && <span className="ab-opportunity-indicator" aria-hidden="true" title={`Augment recommendations available for ${slot.label}. ${suggestionLabel}. Click to review this slot.`}><svg viewBox="0 0 24 32" fill="none"><path d="M8 2C4 3 4 7 7 11C10 15 11 18 11 22L14 22C16 16 13 11 13 7C13 5 15 3 14 2C13 1 10 1 8 2Z" fill="currentColor" /><path d="M8 4C6 6 8 9 10 11" stroke="#ffded3" strokeWidth="1.3" strokeLinecap="round" /><path d="M12.5 25C16 23.5 17 28 13.5 30C10 31 9 26.5 12.5 25Z" fill="currentColor" /></svg></span>}
              </button>
            </div>;
          })}
        </div>
        <div className="ab-legend"><span><i /> {plan.character ? "Open socket" : "Unplanned"}</span><span><i className="filled" /> {plan.character ? "Filled socket" : "Planned"}</span><span>{plan.character ? `${openSockets} sockets open in your plan` : `${equipmentSlots.length - validPositions.size} positions unplanned`}</span></div>
        <p className="ab-capacity-note">{plan.character ? equipmentView === "augments" ? "Click a position to manage its sockets. Suggestions respect lore, socket types, and equipment restrictions." : "Select a socket below to plan changes to its augment." : "Plan multiple augments per position. Socket types and capacity depend on your in-game gear."}</p>
        {target && (!plan.character || equipmentView === "equipment") && <section className="ab-inspector" aria-label={`${selectedLabel} augment plan`}>
          <div className="ab-section-heading"><h3>{selectedLabel}</h3></div>
          {plan.character && <div className="ab-gear-inspector">
            {selectedGear ? <><Link href={`/items/${selectedGear.id}`} target="_blank"><ItemIcon icon={selectedGear.icon} name={selectedGear.name} size="sm" />{selectedGear.name}</Link>
              <p>{equipmentView === "equipment" ? "Currently equipped augments · select a socket to plan changes" : "Your planned augments · select an occupied socket to replace"}</p>
              {!selectedGear.sockets.some((socket) => socket.visible) && <p>This item has no visible augment sockets.</p>}
              {selectedGear.sockets.filter((socket) => socket.visible).map((socket) => {
                const key = `${selectedGear.slotId}:${socket.index}`;
                const planned = plan.augments[key];
                const id = equipmentView === "equipment" ? socket.installedAugmentId : planned;
                const augment = id ? items.get(id) : undefined;
                return <div className="ab-socket-row" key={key}><button disabled={socket.unavailable && !plan.ignoreEquippedAugments} aria-pressed={target.socketIndex === socket.index || target.replacingKey === key} onClick={() => {
                  setTarget({ slotId: selectedGear.slotId, socketIndex: socket.index, replacingKey: planned ? key : undefined }); setEquipmentView("augments"); setTab("catalog"); setRecommendationSlot(selectedGear.slotId);
                }}><span>Socket {socket.index} · Type {socket.type}</span><strong>{socket.unavailable ? "Occupied · augment not discovered" : augment?.name ?? "Empty socket"}</strong></button>
                  {equipmentView === "augments" && planned && <div><button aria-label={`Move augment in socket ${socket.index}`} onClick={() => { setMovingFrom(key); setNotice("Select a destination position or socket, then choose Move here."); }}>Move</button><button aria-label={`Remove augment from socket ${socket.index}`} onClick={() => removeAugment(key)}>Remove</button></div>}
                </div>;
              })}</> : <p>No equipment is recorded in this position.</p>}
          </div>}
          {!plan.character && !Object.keys(plan.augments).some((key) => key.startsWith(`${target.slotId}:`)) && <p className="ab-position-note">No augments planned here yet. Choose from the matching discovered augments.</p>}
          {!plan.character && Object.entries(plan.augments).filter(([key]) => key.startsWith(`${target.slotId}:`)).map(([key, id]) => {
            const item = items.get(id);
            return <div className="ab-planned-augment" key={key} draggable={Boolean(item)} onDragStart={(event) => event.dataTransfer.setData("text/plain", `${id}:${key}`)}>
              {item ? <Link href={`/items/${id}`} target="_blank"><ItemIcon icon={item.icon} name={item.name} size="sm" />{item.name}</Link> : <p>Unavailable augment</p>}
              <div><button onClick={() => { setTarget({ slotId: target.slotId, replacingKey: key }); setTab("catalog"); }}>Replace</button><button onClick={() => { setMovingFrom(key); setNotice("Select a destination position, then choose Move here."); }}>Move</button><button onClick={() => removeAugment(key)}>Remove</button></div>
            </div>;
          })}
          {movingFrom && <div className="ab-move"><p>Moving {items.get(plan.augments[movingFrom])?.name}</p><button onClick={() => { const item = items.get(plan.augments[movingFrom]); if (item) place(item, target, movingFrom); }}>Move here</button><button onClick={() => setMovingFrom(null)}>Cancel</button></div>}
        </section>}

        <section className="ab-totals" aria-label="Augment stat totals"><div className="ab-section-heading"><h3>Augment contribution</h3><Sparkles size={17} /></div>
          <div className="ab-primary-totals">{["ac", "hp", "mana", "endur"].map((key) => <div key={key}><strong>{totals[key] > 0 ? "+" : ""}{totals[key]}</strong><span>{augmentStats.find((stat) => stat.key === key)?.label}</span></div>)}</div>
          <details><summary>All stats & effects</summary><dl>{augmentStats.filter(({ key }) => totals[key] !== 0).map(({ key, label }) => <div key={key}><dt>{label}</dt><dd>{totals[key] > 0 ? "+" : ""}{totals[key]}</dd></div>)}</dl>
            {validAugments.filter((item) => item.bonuses.length).map((item, index) => <p key={`${item.id}:${index}`}>{item.name}: {item.bonuses.map((bonus, bonusIndex) => <span key={bonusIndex}>{bonusIndex > 0 && " · "}{bonus.label} <span className="ab-contribution-value">{bonus.value > 0 ? "+" : ""}{bonus.value}{bonus.unit}</span></span>)}</p>)}
            {[...new Map(validAugments.flatMap((item) => item.effects).map((effect) => [`${effect.kind}:${effect.id}`, effect])).values()].map((effect) => <Link key={`${effect.kind}:${effect.id}`} href={`/spells/${effect.id}`} target="_blank">{effect.kind}: {effect.name}</Link>)}</details>
          <p>Raw augment stats only. Haste uses the highest value. Skill, instrument, and conditional damage bonuses are listed separately. Recommended-level scaling, stat caps, and spell-effect stacking are not applied.</p>
        </section>
      </aside>

      <section id="bench-catalog" className="ab-catalog" aria-label="Augment catalog">
        <div className="ab-tabs" role="tablist" aria-label="Aug Bench views" onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? "catalog" : event.key === "End" ? "acquire" : tab === "catalog" ? "acquire" : "catalog";
          setTab(next); document.getElementById(`${next}-tab`)?.focus();
        }}><button id="catalog-tab" role="tab" tabIndex={tab === "catalog" ? 0 : -1} aria-selected={tab === "catalog"} aria-controls="catalog-panel" onClick={() => setTab("catalog")}><Gem size={16} /> Discovered augments <span>{augments.length}</span></button><button id="acquire-tab" role="tab" tabIndex={tab === "acquire" ? 0 : -1} aria-selected={tab === "acquire"} aria-controls="acquire-panel" onClick={() => setTab("acquire")}><ShoppingBag size={16} /> To acquire <span>{missing}</span></button></div>
        {tab === "catalog" ? <div id="catalog-panel" role="tabpanel" aria-labelledby="catalog-tab">
          <div className="ab-catalog-intro"><h2>Browse augments</h2><p>Every augment below has been discovered on the server.</p></div>
          <div className="ab-search"><Search size={19} /><input aria-label="Search augments" type="search" placeholder="Search augments, benefits, or item ID…" maxLength={120} value={q} onChange={(event) => setQ(event.target.value)} />{q && <button aria-label="Clear augment search" onClick={() => setQ("")}><X size={15} /></button>}</div>
          <div className="ab-categories" aria-label="Augment categories"><button aria-pressed={!category} onClick={() => setCategory("")}>All augments</button>{categories.map((name) => <button key={name} aria-pressed={category === name} onClick={() => setCategory(category === name ? "" : name)}>{name}</button>)}</div>
          <details className="ab-filter-disclosure"><summary><SlidersHorizontal size={14} /> Filters <span>{[target, type, benefit, trade, ownership].filter(Boolean).length || "Position, type, benefit & ownership"}</span></summary><div className="ab-filters">
            <label>Equipment position<select value={target ? String(target.slotId) : ""} onChange={(event) => event.target.value === "" ? setTarget(null) : chooseSlot(Number(event.target.value))}><option value="">Any position</option>{equipmentSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}</select></label>
            <label>Augment type<select value={type} onChange={(event) => setType(event.target.value)}><option value="">Any type</option>{[...new Set(augments.flatMap((item) => planningAugmentTypes(item.augType)))].sort((a, b) => a - b).map((value) => <option key={value} value={value}>Type {value}</option>)}</select></label>
            <label>Benefit<select value={benefit} onChange={(event) => { setBenefit(event.target.value); if (event.target.value) { setSort(event.target.value); setDescending(true); } }}><option value="">Any benefit</option>{augmentStats.map((stat) => <option key={stat.key} value={stat.key}>{stat.label}</option>)}</select></label>
            {benefit && <label>Minimum<input type="number" value={minimum} onChange={(event) => setMinimum(Number(event.target.value) || 0)} /></label>}
            <label>Availability<select value={trade} onChange={(event) => setTrade(event.target.value)}><option value="">Tradeable & no drop</option><option value="tradeable">Tradeable</option><option value="no-drop">No drop</option></select></label>
            <label>My collection<select value={ownership} onChange={(event) => setOwnership(event.target.value)}><option value="">All augments</option><option value="owned">Owned</option><option value="needed">Still needed</option></select></label>
          </div></details>
          {target && <div className="ab-target"><Gem size={18} /><span><strong>{selectedLabel}{target.socketIndex ? ` / Socket ${target.socketIndex}` : ""}</strong><small>{selectedAugment ? `Replacing ${selectedAugment.name}` : plan.character ? `${selectedGear?.name ?? "No equipment"} / ${target.socketIndex ? `Type ${selectedGear?.sockets.find((socket) => socket.index === target.socketIndex)?.type}` : "Matching equipment socket types"}` : `Allowed in this position · ${type ? `Type ${type}` : "Any augment type"}`}</small></span>{target.replacingKey && <button onClick={() => setTarget({ slotId: target.slotId })}>Cancel replacement</button>}<button aria-label="Browse all positions" onClick={() => setTarget(null)}><X size={16} /></button></div>}
          {movingFrom && target && <div className="ab-move"><p>Moving {items.get(plan.augments[movingFrom])?.name} to {selectedLabel}</p><button onClick={() => { const item = items.get(plan.augments[movingFrom]); if (item) place(item, target, movingFrom); }}>Move to {selectedLabel}</button><button onClick={() => setMovingFrom(null)}>Cancel move</button></div>}
          <div className="ab-results-toolbar"><span>{filtered.length} {filtered.length === 1 ? "augment" : "augments"}</span><button className="ab-reset" onClick={() => { setQ(""); setCategory(""); setBenefit(""); setType(""); setTrade(""); setOwnership(""); setMinimum(1); }}>Reset filters</button><label><SlidersHorizontal size={14} /><select aria-label="Sort augments" value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">Name</option><option value="category">Category</option>{augmentStats.map((stat) => <option key={stat.key} value={stat.key}>{stat.label}</option>)}</select></label><button aria-label={descending ? "Sort ascending" : "Sort descending"} title={descending ? "Highest first" : "Lowest first"} onClick={() => setDescending(!descending)}><ArrowDownUp size={15} /></button></div>
          <div className="ab-view-toolbar"><div role="group" aria-label="Catalog view"><button aria-label="Grid view" aria-pressed={catalogView === "grid"} onClick={() => setCatalogView("grid")}><LayoutGrid size={14} /> Grid</button><button aria-label="Compact view" aria-pressed={catalogView === "compact"} onClick={() => setCatalogView("compact")}><List size={14} /> Compact</button></div><span>Scroll results · {pageSize} per page</span></div>
          <div ref={resultsRef} className={`ab-results ab-results-${catalogView}`} role="region" aria-label="Augment results" tabIndex={0}>
            {!pageItems.length && <div className="ab-empty"><Search size={28} /><h3>No matching augments</h3><p>Try a different benefit, type, or equipment position. Your class, race, level, and selected position also limit these results.</p></div>}
            {pageItems.map((item) => {
              const problem = compatibleProblem(item);
              const wanted = (plan.wanted[item.id] ?? 0) > 0;
              const delta = target && sort !== "name" && sort !== "category" ? (item.stats[sort] ?? 0) - (selectedAugment?.stats[sort] ?? 0) : null;
              return <article className="ab-augment" key={item.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(item.id))}>
                <div className="ab-augment-main"><ItemIcon icon={item.icon} name={item.name} tooltipItemId={item.id} />
                  <div className="ab-augment-info"><Link href={`/items/${item.id}`} target="_blank" data-item-tooltip-id={item.id} title={item.name}>{item.name}</Link>
                    {catalogView === "grid" ? <CardStats item={item} priority={benefit || sort} onDetails={() => setExpanded(item.id)} /> : <p>{statSummary(item)}</p>}
                    <small className="ab-card-meta"><span title={`Type ${planningAugmentTypes(item.augType).join(" / ")}`}>Type {planningAugmentTypes(item.augType).join(" / ")}</span><span>{restrictionLabels[item.restriction] ?? `Restriction ${item.restriction}`} · {item.tradeable ? "Tradeable" : "No drop"}{item.loreGroup !== 0 && " · Lore"}</span></small></div>
                  <div className="ab-row-actions">{delta !== null && <span className={delta >= 0 ? "ab-positive" : "ab-negative"}>{delta > 0 ? "+" : ""}{delta} {augmentStats.find((stat) => stat.key === sort)?.label}</span>}
                    <button className="ab-place" disabled={!target || Boolean(problem)} title={problem ?? (target ? "Add to selected position" : "Select a position to plan this augment")} aria-label={`Place ${item.name}`} onClick={() => place(item, target, null)}><Plus size={15} /><span>Place</span></button>
                    <button aria-label={`${wanted ? "Remove" : "Add"} ${item.name} ${wanted ? "from" : "to"} acquisition list`} aria-pressed={wanted} title={wanted ? "Remove from wish list" : "Add to acquisition list"} onClick={() => change({ ...plan, wanted: { ...plan.wanted, [item.id]: wanted ? 0 : 1 } }, wanted ? "Removed from wish list. Planned augments remain on the acquisition list." : `${item.name} added to your acquisition list.`)}>{wanted ? <Check size={16} /> : <ShoppingBag size={16} />}</button>
                    <button aria-expanded={expanded === item.id} aria-haspopup={catalogView === "grid" ? "dialog" : undefined} aria-label={`Details for ${item.name}`} onClick={() => setExpanded(expanded === item.id ? null : item.id)}><SlidersHorizontal size={15} /></button>
                  </div>
                </div>
                {expanded === item.id && <AugmentDetails modal={catalogView === "grid"} name={item.name} onClose={() => setExpanded(null)}><p>Type {planningAugmentTypes(item.augType).join(" / ")} · {restrictionLabels[item.restriction] ?? `Restriction ${item.restriction}`} · {item.tradeable ? "Tradeable" : "No drop"}{item.loreGroup !== 0 && " · Lore"}</p><p>{problem && target ? problem : "Plan this augment by position. Check its type and restrictions against your gear in game."}</p><dl>{augmentStats.filter(({ key }) => item.stats[key] && !conditionalStatKeys.has(key)).map(({ key, label }) => <div key={key}><dt>{label}</dt><dd>{item.stats[key]}</dd></div>)}</dl>{item.bonuses.map((bonus, index) => <p key={index}>{bonus.label}: {bonus.value > 0 ? "+" : ""}{bonus.value}{bonus.unit}</p>)}<p>Fits: {equipmentSlots.filter((slot) => (slot.mask & item.slots) !== 0).map((slot) => slot.label).join(", ") || "No wearable positions"}</p><p>Required level {item.requiredLevel || 1} · Recommended level {item.recommendedLevel || 1}</p><p>Classes: {itemClassNames.filter((_, i) => (item.classes & 2 ** i) !== 0).join(", ") || "None"}</p><p>Races: {itemRaceFilterOptions.filter((_, i) => (item.races & 2 ** i) !== 0).join(", ") || "None"}</p>{item.effects.map((effect) => <Link key={`${effect.kind}:${effect.id}`} href={`/spells/${effect.id}`} target="_blank">{effect.kind}: {effect.name}</Link>)}
                  <label>Copies owned<input type="number" min={0} max={999} value={plan.owned[item.id] ?? 0} onChange={(event) => change({ ...plan, owned: { ...plan.owned, [item.id]: Math.max(0, Math.min(999, Math.trunc(Number(event.target.value) || 0))) } })} /></label>
                  <Link href={`/items/${item.id}`} target="_blank">View item, drop sources & market →</Link>
                </AugmentDetails>}
              </article>;
            })}
          </div>
          {filtered.length > 0 && <div className="ab-pagination"><span>{currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, filtered.length)} of {filtered.length}</span><div><button aria-label="Previous augments" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17} /></button><span>Page {currentPage + 1} of {Math.ceil(filtered.length / pageSize)}</span><button aria-label="Next augments" disabled={(currentPage + 1) * pageSize >= filtered.length} onClick={() => setPage(currentPage + 1)}><ChevronRight size={17} /></button></div></div>}
        </div> : <div id="acquire-panel" role="tabpanel" aria-labelledby="acquire-tab" className="ab-acquire">
          <div className="ab-catalog-intro"><h2>Your acquisition list</h2><p>Planned augments and your wish list, minus the copies you own. Quantities are tracked manually.</p></div>
          <button disabled={!acquisitions.length} onClick={() => exportFile([`Aug Bench: ${plan.name}`, ...acquisitions.filter((entry) => entry.missing).map((entry) => `${entry.missing} x ${entry.item.name} (${entry.item.tradeable ? "Tradeable" : "No drop"}) - ${window.location.origin}/items/${entry.item.id}`)].join("\n"), "aug-bench-acquisition-list.txt", "text/plain")}><Download size={15} /> Export acquisition list</button>
          {!acquisitions.length && <div className="ab-empty"><ShoppingBag size={32} /><h3>Build your acquisition list</h3><p>Plan augments for a position or use the bag button in the catalog. Track owned copies here to see what is left to acquire.</p><button onClick={() => setTab("catalog")}>Browse discovered augments</button></div>}
          {acquisitions.map(({ item, quantity, owned, missing: remaining }) => <article className="ab-acquire-row" key={item.id}><div className="ab-acquire-name"><ItemIcon icon={item.icon} name={item.name} /><div><Link href={`/items/${item.id}`} target="_blank">{item.name}</Link><p>{item.tradeable ? "Tradeable · Check market & sources" : "No drop · Check acquisition sources"}</p><small>{Object.entries(plan.augments).filter(([, id]) => id === item.id).map(([key]) => equipmentSlots[Number(key.split(":")[0])]?.label).join(", ") || "Wish list"}</small></div></div><div className="ab-quantities"><span>Need <strong>{quantity}</strong></span><label>Owned<input aria-label={`Owned copies of ${item.name}`} type="number" min={0} max={999} value={owned} onChange={(event) => change({ ...plan, owned: { ...plan.owned, [item.id]: Math.max(0, Math.min(999, Math.trunc(Number(event.target.value) || 0))) } })} /></label><label>Wish list<input aria-label={`Wanted copies of ${item.name}`} type="number" min={0} max={999} value={plan.wanted[item.id] ?? 0} onChange={(event) => change({ ...plan, wanted: { ...plan.wanted, [item.id]: Math.max(0, Math.min(999, Math.trunc(Number(event.target.value) || 0))) } })} /></label><span className={remaining ? "ab-remaining" : "ab-complete"}>{remaining ? `${remaining} to acquire` : "✓ Complete"}</span></div></article>)}
        </div>}
        <footer className="ab-data-note">{augments.length} discovered augments · Database snapshot {new Date(catalog.retrievedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}<button onClick={() => setRefresh((n) => n + 1)}>Refresh data</button></footer>
      </section>
    </div>
    {recommendationGear && recommendationSlot !== null && equipmentView === "augments" && <Recommendations key={`${plan.character?.character.id}:${recommendationSlot}`} gear={recommendationGear} position={equipmentSlots[recommendationSlot].label} sockets={recommendations.get(recommendationSlot) ?? []} initialSocketIndex={target?.socketIndex} plan={plan} items={items} priority={recommendationPriority} onPriority={setRecommendationPriority} onClose={() => setRecommendationSlot(null)} onRemove={removeAugment} onMove={(item, sourceKey, destination) => { place(item, destination, sourceKey); setRecommendationSlot(null); }} onApply={(item, socket) => place(item, { slotId: recommendationSlot, socketIndex: socket.index, replacingKey: socket.current ? socket.key : undefined })} />}
  </div>;
}
