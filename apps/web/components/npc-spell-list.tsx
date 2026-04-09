"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@eq-alla/ui";
import { SpellIcon } from "./spell-icon";

const COLLAPSED_SPELL_COUNT = 4;

type NpcSpellListProps = {
  spells: Array<{ id: number; name: string; href: string; type: string; icon: string }>;
};

export function NpcSpellList({ spells }: NpcSpellListProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const hasOverflow = spells.length > COLLAPSED_SPELL_COUNT;
  const visibleSpells = expanded || !hasOverflow ? spells : spells.slice(0, COLLAPSED_SPELL_COUNT);
  const hiddenSpellCount = spells.length - COLLAPSED_SPELL_COUNT;

  return (
    <div className="space-y-3">
      <div id={listId} className="space-y-3">
        {visibleSpells.map((entry) => (
          <Link
            key={entry.id}
            href={entry.href}
            className="group flex items-center gap-3 rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.94),rgba(10,14,21,0.92))] px-3 py-3 transition hover:border-[#c5a869]/45 hover:bg-[linear-gradient(180deg,rgba(35,42,53,0.96),rgba(16,20,28,0.92))]"
          >
            <SpellIcon icon={entry.icon} name={entry.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-[#e6e0d2] transition group-hover:text-white">{entry.name}</p>
              <p className="text-[12px] uppercase tracking-[0.18em] text-[#9f8e79]">{entry.type}</p>
            </div>
          </Link>
        ))}
      </div>

      {hasOverflow ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-white/10 bg-black/20 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9f8e79]">
            {expanded ? `Showing all ${spells.length} spells` : `${hiddenSpellCount} more spell${hiddenSpellCount === 1 ? "" : "s"} hidden`}
          </p>
          <Button
            type="button"
            variant="outline"
            aria-controls={listId}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className="px-3 py-2 text-[11px] uppercase tracking-[0.16em]"
          >
            {expanded ? "Show fewer" : `Show all ${spells.length}`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
