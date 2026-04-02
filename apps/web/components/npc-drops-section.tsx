"use client";

import Link from "next/link";
import { useState } from "react";
import type { NpcDetail } from "@eq-alla/data";
import { Button } from "@eq-alla/ui";
import { SectionCard } from "./catalog-shell";
import { ItemIcon } from "./item-icon";

type DropGroup = NpcDetail["drops"][number];

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: value > 0 && value < 1 ? 3 : 2
  }).format(value);
}

function DropGroupHeader({ group }: { group: DropGroup }) {
  return (
    <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#c5a869]">
      With a probability of {formatPercent(group.probability)}% (multiplier: {group.multiplier})
    </p>
  );
}

function DropListView({ drops }: { drops: DropGroup[] }) {
  return (
    <div className="space-y-5">
      {drops.map((group) => (
        <div key={group.lootdropId} className="space-y-3">
          <DropGroupHeader group={group} />
          <div className="space-y-3">
            {group.items.map((entry) => (
              <Link
                key={`${group.lootdropId}-${entry.id}`}
                href={entry.href}
                className="group flex items-center gap-3 rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.94),rgba(10,14,21,0.92))] px-3 py-3 transition hover:border-[#c5a869]/45 hover:bg-[linear-gradient(180deg,rgba(35,42,53,0.96),rgba(16,20,28,0.92))]"
              >
                <ItemIcon icon={entry.icon} name={entry.name} size="sm" tooltipItemId={entry.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[#e6e0d2] transition group-hover:text-white">{entry.name}</p>
                  <p className="text-[12px] uppercase tracking-[0.18em] text-[#9f8e79]">
                    {entry.type} • {formatPercent(entry.chance)}% within roll • {formatPercent(entry.globalChance)}% overall per kill
                  </p>
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
      {drops.map((group) => (
        <div key={group.lootdropId} className="space-y-3">
          <DropGroupHeader group={group} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((entry) => (
              <Link
                key={`${group.lootdropId}-${entry.id}`}
                href={entry.href}
                className="group flex min-h-[158px] flex-col justify-between rounded-[14px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.96),rgba(11,14,20,0.94))] p-4 transition hover:border-[#c5a869]/45 hover:bg-[linear-gradient(180deg,rgba(35,42,53,0.98),rgba(16,20,28,0.94))]"
              >
                <div className="flex items-start gap-3">
                  <ItemIcon icon={entry.icon} name={entry.name} size="md" tooltipItemId={entry.id} />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[15px] font-semibold leading-6 text-[#e6e0d2] transition group-hover:text-white">{entry.name}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9f8e79]">{entry.type}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/8 pt-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8e7d68]">Within roll</p>
                    <p className="mt-1 text-[1.25rem] font-semibold tracking-[-0.03em] text-[#f1eadc]">{formatPercent(entry.chance)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8e7d68]">Overall per kill</p>
                    <p className="mt-1 text-sm font-medium text-[#d8ceb4]">{formatPercent(entry.globalChance)}%</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function NpcDropsSection({ drops }: { drops: DropGroup[] }) {
  const [view, setView] = useState<"list" | "cards">("cards");

  return (
    <SectionCard
      title="When Killed, This NPC Drops"
      right={
        drops.length > 0 ? (
          <div className="inline-flex rounded-[12px] border border-white/10 bg-black/20 p-1">
            <Button
              type="button"
              variant={view === "list" ? "default" : "ghost"}
              className="px-3 py-2 text-xs uppercase tracking-[0.14em]"
              onClick={() => setView("list")}
            >
              List
            </Button>
            <Button
              type="button"
              variant={view === "cards" ? "default" : "ghost"}
              className="px-3 py-2 text-xs uppercase tracking-[0.14em]"
              onClick={() => setView("cards")}
            >
              Cards
            </Button>
          </div>
        ) : null
      }
    >
      {drops.length > 0 ? (
        <div className="space-y-5">
          <p className="text-sm leading-6 text-[#aeb8ca]">
            “Overall per kill” is the effective drop chance after the lootdrop roll probability is applied. “Within roll” is the item&apos;s
            chance inside that lootdrop once the roll happens.
          </p>
          {view === "list" ? <DropListView drops={drops} /> : <DropCardView drops={drops} />}
        </div>
      ) : (
        <p className="text-[15px] leading-6 text-[#aeb8ca]">No loot entries were found for this NPC.</p>
      )}
    </SectionCard>
  );
}
