"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { NpcDetail } from "@eq-alla/data";
import { Button } from "@eq-alla/ui";
import { BarChart3, Calculator, Grid2X2, Info, List, Sparkles, Target } from "lucide-react";
import { SectionCard } from "./catalog-shell";
import { ItemIcon } from "./item-icon";

type DropGroup = NpcDetail["drops"][number];
type DropItem = DropGroup["items"][number];
type DropView = "lab" | "list" | "cards";

type LabEntry = DropItem & {
  group: DropGroup;
  key: string;
  rollAttempts: number;
  normalizedChance: number;
  overallChance: number;
};

type LootdropPassStats = {
  totalWeight: number;
  noLootProbability: number;
  rollTableChanceBypass: boolean;
};

const killTargets = [
  { label: "50%", probability: 0.5 },
  { label: "90%", probability: 0.9 },
  { label: "95%", probability: 0.95 },
  { label: "99%", probability: 0.99 }
] as const;
const EXPECTED_DROP_PROBABILITY = 1 - 1 / Math.E;
const lootdropPassStatsCache = new WeakMap<DropGroup, LootdropPassStats>();

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function positiveInteger(value: number | null | undefined, fallback = 0) {
  const normalized = Math.floor(Number(value ?? fallback));
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
}

function probability(value: number | null | undefined) {
  return clamp(Number(value ?? 0) / 100, 0, 1);
}

function formatPercent(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: safeValue > 0 && safeValue < 1 ? 3 : 2
  }).format(safeValue);
}

function formatCompactPercent(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${formatPercent(safeValue)}%`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${formatCount(value)} ${value === 1 ? singular : plural}`;
}

function lootdropPassStats(group: DropGroup) {
  const cached = lootdropPassStatsCache.get(group);

  if (cached) {
    return cached;
  }

  const stats = group.items.reduce<LootdropPassStats>(
    (nextStats, item) => {
      const itemProbability = probability(item.chance);

      return {
        totalWeight: nextStats.totalWeight + Math.max(0, Number(item.chance ?? 0)),
        noLootProbability: itemProbability >= 1 ? nextStats.noLootProbability : nextStats.noLootProbability * (1 - itemProbability),
        rollTableChanceBypass: nextStats.rollTableChanceBypass || itemProbability >= 1
      };
    },
    { totalWeight: 0, noLootProbability: 1, rollTableChanceBypass: false }
  );

  lootdropPassStatsCache.set(group, stats);

  return stats;
}

function lootdropPassLimit(group: DropGroup) {
  const minDrops = positiveInteger(group.minDrops, 0);
  const dropLimit = positiveInteger(group.dropLimit, 0);
  const defaultLargeLootdropLimit = minDrops > 0 && dropLimit === 0 && group.items.length > 100 ? 10 : 0;

  return Math.max(minDrops, dropLimit, defaultLargeLootdropLimit);
}

function groupRollAttempts(group: DropGroup) {
  const multiplier = positiveInteger(group.multiplier, 1);
  const passLimit = lootdropPassLimit(group);
  const passAttempts = passLimit > 0 ? passLimit : 1;

  return multiplier * passAttempts;
}

function normalizedItemChance(group: DropGroup, item: DropItem) {
  const rawChance = clamp(Number(item.chance ?? 0), 0, 100);

  if (positiveInteger(group.minDrops, 0) > 0) {
    const { totalWeight } = lootdropPassStats(group);

    if (totalWeight <= 0) {
      return rawChance;
    }

    return clamp((Math.max(0, Number(item.chance ?? 0)) / totalWeight) * 100, 0, 100);
  }

  return rawChance;
}

function lootdropPassItemChance(group: DropGroup, item: DropItem) {
  const minDrops = positiveInteger(group.minDrops, 0);
  const dropLimit = lootdropPassLimit(group);
  const rawItemProbability = probability(item.chance);

  if (dropLimit <= 0) {
    return rawItemProbability;
  }

  const { noLootProbability, rollTableChanceBypass, totalWeight } = lootdropPassStats(group);
  const weightedProbability = totalWeight > 0 ? clamp(Math.max(0, Number(item.chance ?? 0)) / totalWeight, 0, 1) : rawItemProbability;
  const optionalRollProbability = rollTableChanceBypass ? 1 : 1 - noLootProbability;
  const guaranteedAttempts = Math.min(minDrops, dropLimit);
  const optionalAttempts = Math.max(0, dropLimit - guaranteedAttempts);
  const guaranteedMiss = Math.pow(1 - weightedProbability, guaranteedAttempts);
  const optionalMiss = Math.pow(1 - optionalRollProbability * weightedProbability, optionalAttempts);

  return clamp(1 - guaranteedMiss * optionalMiss, 0, 1);
}

function estimateOverallChance(group: DropGroup, item: DropItem) {
  const groupProbability = probability(group.probability);
  const passItemProbability = lootdropPassItemChance(group, item);
  const multiplier = positiveInteger(group.multiplier, 1);

  if (groupProbability <= 0 || passItemProbability <= 0 || multiplier <= 0) {
    return 0;
  }

  return clamp((1 - Math.pow(1 - groupProbability * passItemProbability, multiplier)) * 100, 0, 100);
}

function killsForChance(chancePercent: number, targetProbability: number) {
  const p = clamp(chancePercent / 100, 0, 1);

  if (p <= 0) {
    return null;
  }

  if (p >= 1) {
    return 1;
  }

  return Math.max(1, Math.ceil(Math.log(1 - targetProbability) / Math.log(1 - p)));
}

function formatKills(value: number | null) {
  return value === null ? "N/A" : formatCount(value);
}

function rollSummary(group: DropGroup) {
  const attempts = groupRollAttempts(group);
  const multiplier = positiveInteger(group.multiplier, 1);
  const minDrops = positiveInteger(group.minDrops, 0);
  const dropLimit = positiveInteger(group.dropLimit, 0);
  const parts = [pluralize(attempts, "roll"), `${pluralize(multiplier, "pass")} total`];

  if (minDrops > 0) {
    parts.push(`${pluralize(minDrops, "guaranteed roll")} minimum per pass`);
  }

  if (dropLimit > 0) {
    parts.push(`${pluralize(dropLimit, "drop")} cap per pass`);
  }

  return parts.join(" / ");
}

function buildLabEntries(drops: DropGroup[]) {
  return drops.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      group,
      key: `${group.lootdropId}:${item.id}`,
      rollAttempts: groupRollAttempts(group),
      normalizedChance: normalizedItemChance(group, item),
      overallChance: estimateOverallChance(group, item)
    }))
  );
}

function StatTile({
  label,
  value,
  detail,
  tone = "neutral"
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "gold" | "green";
}) {
  const toneClassName =
    tone === "green"
      ? "border-emerald-300/18 bg-emerald-300/[0.045] text-emerald-100"
      : tone === "gold"
        ? "border-[#d7b06c]/18 bg-[#d7b06c]/[0.06] text-[#f6e2b6]"
        : "border-white/9 bg-white/[0.035] text-[#f1eadc]";

  return (
    <div className={`min-w-0 rounded-[12px] border px-3 py-3 ${toneClassName}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9f8e79]">{label}</p>
      <p className="mt-1 text-[1.35rem] font-semibold leading-7 tracking-[-0.03em] text-inherit">{value}</p>
      {detail ? <p className="mt-1 text-[11px] leading-4 text-[#8b96aa]">{detail}</p> : null}
    </div>
  );
}

function DropGroupMeta({ group }: { group: DropGroup }) {
  const hasFloor = positiveInteger(group.minDrops, 0) > 0;
  const hasLimit = positiveInteger(group.dropLimit, 0) > 0;

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="rounded-full border border-[#c5a869]/20 bg-[#c5a869]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#e9d19b]">
        {formatCompactPercent(group.probability)} roll
      </span>
      <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c8bea9]">
        x{positiveInteger(group.multiplier, 1)}
      </span>
      {hasFloor ? (
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
          Min {positiveInteger(group.minDrops, 0)}
        </span>
      ) : null}
      {hasLimit ? (
        <span className="rounded-full border border-[#df8a58]/25 bg-[#df8a58]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ffd0b8]">
          Cap {positiveInteger(group.dropLimit, 0)}
        </span>
      ) : null}
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon: Icon,
  children
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof BarChart3;
  children: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      className={`gap-2 px-3 py-2 text-xs uppercase tracking-[0.14em] ${active ? "" : "text-[#c8bea9] hover:text-white"}`.trim()}
      onClick={onClick}
    >
      <Icon className="size-3.5" strokeWidth={2.2} />
      {children}
    </Button>
  );
}

function LootGroupPicker({
  drops,
  selectedKey,
  onSelect
}: {
  drops: DropGroup[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="space-y-3">
      {drops.map((group, index) => (
        <div key={group.lootdropId} className="overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.025]">
          <div className="space-y-2 border-b border-white/8 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c5a869]">Lootdrop {index + 1}</p>
              <span className="text-[11px] font-medium text-[#8d9aad]">{pluralize(group.items.length, "item")}</span>
            </div>
            <DropGroupMeta group={group} />
          </div>

          <div className="divide-y divide-white/7">
            {group.items.map((item) => {
              const key = `${group.lootdropId}:${item.id}`;
              const selected = key === selectedKey;
              const overallChance = estimateOverallChance(group, item);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelect(key)}
                  className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left transition ${
                    selected
                      ? "bg-[#d7b06c]/12 shadow-[inset_3px_0_0_rgba(215,176,108,0.75)]"
                      : "hover:bg-white/[0.035]"
                  }`}
                >
                  <ItemIcon icon={item.icon} name={item.name} size="xs" tooltipItemId={item.id} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#f1eadc]">{item.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] uppercase tracking-[0.16em] text-[#8f7f68]">{item.type}</span>
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/18 px-2.5 py-1 text-[11px] font-semibold text-[#d8ceb4]">
                    {formatCompactPercent(overallChance)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SelectedItemPanel({ entry }: { entry: LabEntry }) {
  const group = entry.group;
  const averageKills = killsForChance(entry.overallChance, EXPECTED_DROP_PROBABILITY);
  const hasGuaranteedFloor = positiveInteger(group.minDrops, 0) > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-[16px] border border-[#d7b06c]/18 bg-[linear-gradient(180deg,rgba(215,176,108,0.08),rgba(255,255,255,0.025))] p-4">
        <div className="flex items-start gap-4">
          <ItemIcon icon={entry.icon} name={entry.name} size="md" tooltipItemId={entry.id} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c5a869]">Selected Item</p>
            <Link href={entry.href} className="mt-1 block truncate text-xl font-semibold tracking-[-0.03em] text-white hover:underline">
              {entry.name}
            </Link>
            <p className="mt-1 text-sm leading-6 text-[#aeb8ca]">{entry.type}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Within Roll" value={formatCompactPercent(entry.chance)} detail="Raw lootdrop entry chance" />
        <StatTile
          label={hasGuaranteedFloor ? "Weighted Floor" : "Roll Weight"}
          value={formatCompactPercent(entry.normalizedChance)}
          detail={hasGuaranteedFloor ? "Normalized against group weights" : "Used directly for rolls"}
          tone={hasGuaranteedFloor ? "green" : "neutral"}
        />
        <StatTile label="Overall / Kill" value={formatCompactPercent(entry.overallChance)} detail={`${rollSummary(group)}`} tone="gold" />
      </div>

      <div className="rounded-[16px] border border-white/10 bg-black/18 p-4">
        <div className="flex items-start gap-3">
          <Calculator className="mt-0.5 size-4 shrink-0 text-[#d7b06c]" />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#f1eadc]">Chance model</p>
            <p className="text-sm leading-6 text-[#aeb8ca]">
              {hasGuaranteedFloor
                ? "This group has a guaranteed floor, so the lab treats item chance as a selection weight for those guaranteed rolls, then applies the lootdrop probability."
                : "This estimate treats each configured group roll as an independent chance to pass the lootdrop probability and then the item chance."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Average" value={formatKills(averageKills)} detail="kills for one expected drop" tone="green" />
        {killTargets.map((target) => (
          <StatTile
            key={target.label}
            label={target.label}
            value={formatKills(killsForChance(entry.overallChance, target.probability))}
            detail="kills for this confidence"
          />
        ))}
      </div>

      <LootContextCards />
    </div>
  );
}

function LootContextCards() {
  return (
    <div className="grid gap-3">
      <div className="rounded-[16px] border border-[#df8a58]/18 bg-[#df8a58]/[0.055] p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 size-4 shrink-0 text-[#ffb48c]" />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#ffe0cf]">About guaranteed floors</p>
            <p className="text-sm leading-6 text-[#d9c4b8]">
              When a loot group has a minimum drop count, raw item percentages work more like weights. The lab calls that out so players do not read every visible item chance as a final per-kill chance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LootOddsLab({ drops }: { drops: DropGroup[] }) {
  const entries = useMemo(() => buildLabEntries(drops), [drops]);
  const [selectedKey, setSelectedKey] = useState(entries[0]?.key ?? "");
  const selectedEntry = entries.find((entry) => entry.key === selectedKey) ?? entries[0];
  const groupsWithFloor = drops.filter((group) => positiveInteger(group.minDrops, 0) > 0);
  const rarestEntry = entries.reduce<LabEntry | null>((rarest, entry) => {
    if (entry.overallChance <= 0) return rarest;
    if (!rarest || entry.overallChance < rarest.overallChance) return entry;
    return rarest;
  }, null);

  if (!selectedEntry) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.82fr)_minmax(0,1.8fr)]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b99a67]">Loot Groups</p>
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8d9aad]">{pluralize(drops.length, "group")}</span>
          </div>
          <LootGroupPicker drops={drops} selectedKey={selectedEntry.key} onSelect={setSelectedKey} />
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Items" value={formatCount(entries.length)} detail="visible discovered drops" />
            <StatTile
              label="Guaranteed Floor"
              value={groupsWithFloor.length > 0 ? formatCount(groupsWithFloor.length) : "0"}
              detail={groupsWithFloor.length > 0 ? "groups need weighted odds" : "no guaranteed groups"}
              tone={groupsWithFloor.length > 0 ? "green" : "neutral"}
            />
            <StatTile
              label="Rarest Visible"
              value={rarestEntry ? formatCompactPercent(rarestEntry.overallChance) : "N/A"}
              detail={rarestEntry?.name ?? "No nonzero odds"}
              tone="gold"
            />
          </div>

          <SelectedItemPanel entry={selectedEntry} />
        </div>
      </div>
    </div>
  );
}

function DropGroupHeader({ group, index }: { group: DropGroup; index: number }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#c5a869]">Lootdrop {index + 1}</p>
      <DropGroupMeta group={group} />
    </div>
  );
}

function DropListView({ drops }: { drops: DropGroup[] }) {
  return (
    <div className="space-y-5">
      {drops.map((group, index) => (
        <div key={group.lootdropId} className="space-y-3">
          <DropGroupHeader group={group} index={index} />
          <div className="space-y-3">
            {group.items.map((entry) => (
              <Link
                key={`${group.lootdropId}-${entry.id}`}
                href={entry.href}
                className="group grid gap-3 rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.94),rgba(10,14,21,0.92))] px-3 py-3 transition hover:border-[#c5a869]/45 hover:bg-[linear-gradient(180deg,rgba(35,42,53,0.96),rgba(16,20,28,0.92))] sm:grid-cols-[auto_minmax(0,1fr)_130px_140px] sm:items-center"
              >
                <ItemIcon icon={entry.icon} name={entry.name} size="sm" tooltipItemId={entry.id} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-[#e6e0d2] transition group-hover:text-white">{entry.name}</p>
                  <p className="text-[12px] uppercase tracking-[0.18em] text-[#9f8e79]">{entry.type}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8e7d68]">Within Roll</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#f1eadc]">{formatCompactPercent(entry.chance)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8e7d68]">Overall / Kill</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#d8ceb4]">{formatCompactPercent(estimateOverallChance(group, entry))}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DropCardView({ drops }: { drops: DropGroup[] }) {
  return (
    <div className="space-y-6">
      {drops.map((group, index) => (
        <div key={group.lootdropId} className="space-y-3">
          <DropGroupHeader group={group} index={index} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((entry) => {
              const overallChance = estimateOverallChance(group, entry);
              const expectedKills = killsForChance(overallChance, EXPECTED_DROP_PROBABILITY);

              return (
                <Link
                  key={`${group.lootdropId}-${entry.id}`}
                  href={entry.href}
                  className="group flex min-h-[172px] flex-col justify-between rounded-[14px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.96),rgba(11,14,20,0.94))] p-4 transition hover:border-[#c5a869]/45 hover:bg-[linear-gradient(180deg,rgba(35,42,53,0.98),rgba(16,20,28,0.94))]"
                >
                  <div className="flex items-start gap-3">
                    <ItemIcon icon={entry.icon} name={entry.name} size="md" tooltipItemId={entry.id} />
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[15px] font-semibold leading-6 text-[#e6e0d2] transition group-hover:text-white">{entry.name}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9f8e79]">{entry.type}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/8 pt-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8e7d68]">Within</p>
                      <p className="mt-1 text-sm font-semibold text-[#f1eadc]">{formatCompactPercent(entry.chance)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8e7d68]">Kill</p>
                      <p className="mt-1 text-sm font-semibold text-[#d8ceb4]">{formatCompactPercent(overallChance)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8e7d68]">Avg</p>
                      <p className="mt-1 text-sm font-semibold text-[#d8ceb4]">{formatKills(expectedKills)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function NpcDropsSection({ drops }: { drops: DropGroup[] }) {
  const [view, setView] = useState<DropView>("list");

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-2">
          <Target className="size-5 text-[#d7b06c]" />
          Loot Drops
        </span>
      }
      right={
        drops.length > 0 ? (
          <div className="inline-flex rounded-[12px] border border-white/10 bg-black/20 p-1">
            <ViewButton active={view === "list"} icon={List} onClick={() => setView("list")}>
              List
            </ViewButton>
            <ViewButton active={view === "lab"} icon={BarChart3} onClick={() => setView("lab")}>
              Lab
            </ViewButton>
            <ViewButton active={view === "cards"} icon={Grid2X2} onClick={() => setView("cards")}>
              Cards
            </ViewButton>
          </div>
        ) : null
      }
    >
      {drops.length > 0 ? (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <p className="text-sm leading-6 text-[#aeb8ca]">
              Compare raw within-roll odds, estimated per-kill odds, expected-kill targets, and guaranteed-floor behavior for this NPC&apos;s loot groups.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d7b06c]/18 bg-[#d7b06c]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f1d69d]">
              <Sparkles className="size-3.5" strokeWidth={2.2} />
              Browser-only math
            </div>
          </div>

          {view === "lab" ? <LootOddsLab drops={drops} /> : null}
          {view === "list" ? <DropListView drops={drops} /> : null}
          {view === "cards" ? <DropCardView drops={drops} /> : null}
        </div>
      ) : (
        <p className="text-[15px] leading-6 text-[#aeb8ca]">No loot entries were found for this NPC.</p>
      )}
    </SectionCard>
  );
}
