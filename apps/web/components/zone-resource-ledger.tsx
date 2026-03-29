"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@eq-alla/ui";
import { ItemIcon } from "./item-icon";

type ZoneMode = "npcs" | "named" | "items" | "forage";

type BestiaryEntry = {
  id: number;
  name: string;
  href: string;
  levelRange: string;
  race: string;
  klass: string;
  classification: string;
  named: boolean;
  variants: number;
};

type ItemEntry = {
  id: number;
  name: string;
  href: string;
  icon: string;
  type: string;
};

type ForageEntry = {
  id: number;
  name: string;
  href: string;
  icon: string;
  chance: number;
  skill: number;
};

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function ModeValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 md:space-y-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#86755f] md:hidden">{label}</p>
      <p className="text-sm text-[#efe4d4]">{value}</p>
    </div>
  );
}

function classificationTone(label: string) {
  switch (label) {
    case "Boss":
      return "border-[#d26f52]/45 bg-[#d26f52]/18 text-[#ffd4c7]";
    case "Mini-Boss":
      return "border-[#c98554]/42 bg-[#c98554]/16 text-[#f4d1b1]";
    case "Named":
    case "Notable":
      return "border-[#c5a869]/42 bg-[#c5a869]/16 text-[#f1d394]";
    case "Quest NPC":
      return "border-[#6e9cc1]/35 bg-[#6e9cc1]/14 text-[#d2e8ff]";
    case "Event Spawned":
      return "border-[#7ca36d]/35 bg-[#7ca36d]/14 text-[#d8f0d0]";
    case "Hidden":
      return "border-white/16 bg-white/6 text-[#c7c0b5]";
    default:
      return "border-white/14 bg-white/[0.04] text-[#cabfad]";
  }
}

function BestiaryLedger({ entries }: { entries: BestiaryEntry[] }) {
  return (
    <div className="divide-y divide-white/8">
      <div className="hidden grid-cols-[minmax(0,1.7fr)_120px_160px_160px_120px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9c8c74] md:grid">
        <p>Creature</p>
        <p>Level</p>
        <p>Race</p>
        <p>Class</p>
        <p>Type</p>
      </div>
      {entries.map((entry) => {
        const classification = entry.named && entry.classification === "Normal" ? "Notable" : entry.classification;

        return (
          <Link
            key={entry.id}
            href={entry.href}
            className="group block px-5 py-4 transition hover:bg-white/[0.025] sm:px-6"
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.7fr)_120px_160px_160px_120px] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold text-[#f3ecdf] transition group-hover:text-white">{entry.name}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#8f7f68]">
                  {entry.variants > 1 ? `${formatCount(entry.variants)} variants` : "Single profile"}
                </p>
              </div>
              <ModeValue label="Level" value={entry.levelRange} />
              <ModeValue label="Race" value={entry.race} />
              <ModeValue label="Class" value={entry.klass} />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#86755f] md:hidden">Type</p>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${classificationTone(classification)}`}>
                  {classification}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function ItemLedger({ entries }: { entries: ItemEntry[] }) {
  return (
    <div className="divide-y divide-white/8">
      {entries.map((entry) => (
        <Link
          key={entry.id}
          href={entry.href}
          className="group grid gap-3 px-5 py-4 transition hover:bg-white/[0.025] sm:grid-cols-[auto_minmax(0,1fr)_160px] sm:items-center sm:px-6"
        >
          <ItemIcon icon={entry.icon} name={entry.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[16px] font-semibold text-[#f3ecdf] transition group-hover:text-white">{entry.name}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[#8f7f68]">Zone equipment</p>
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#86755f] sm:hidden">Type</p>
            <p className="text-sm text-[#e9dcc9]">{entry.type}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ForageLedger({ entries }: { entries: ForageEntry[] }) {
  return (
    <div className="divide-y divide-white/8">
      {entries.map((entry) => (
        <Link
          key={entry.id}
          href={entry.href}
          className="group grid gap-3 px-5 py-4 transition hover:bg-white/[0.025] sm:grid-cols-[auto_minmax(0,1fr)_120px_120px] sm:items-center sm:px-6"
        >
          <ItemIcon icon={entry.icon} name={entry.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[16px] font-semibold text-[#f3ecdf] transition group-hover:text-white">{entry.name}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[#8f7f68]">Forageable item</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#86755f] sm:hidden">Chance</p>
            <p className="text-sm text-[#e9dcc9]">{entry.chance}%</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#86755f] sm:hidden">Skill</p>
            <p className="text-sm text-[#e9dcc9]">{entry.skill > 0 ? entry.skill : "Any"}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function pageSizeForMode(mode: ZoneMode) {
  switch (mode) {
    case "items":
      return 20;
    case "forage":
      return 16;
    case "named":
      return 14;
    case "npcs":
    default:
      return 18;
  }
}

export function ZoneResourceLedger({
  mode,
  bestiary,
  itemDrops,
  forage
}: {
  mode: ZoneMode;
  bestiary: BestiaryEntry[];
  itemDrops: ItemEntry[];
  forage: ForageEntry[];
}) {
  const entries = mode === "items" ? itemDrops : mode === "forage" ? forage : bestiary;
  const pageSize = pageSizeForMode(mode);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [mode]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const pagedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return entries.slice(start, start + pageSize);
  }, [currentPage, entries, pageSize]);

  const start = entries.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(currentPage * pageSize, entries.length);

  return (
    <div>
      {mode === "items" ? <ItemLedger entries={pagedEntries as ItemEntry[]} /> : null}
      {mode === "forage" ? <ForageLedger entries={pagedEntries as ForageEntry[]} /> : null}
      {mode === "npcs" || mode === "named" ? <BestiaryLedger entries={pagedEntries as BestiaryEntry[]} /> : null}

      {totalPages > 1 ? (
        <div className="flex flex-col gap-3 border-t border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8f836f]">
            Showing {start}-{end} of {formatCount(entries.length)}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              className="rounded-lg border border-white/8 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#c8bea9] hover:border-white/14 hover:bg-white/[0.03]"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-lg border border-white/8 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#c8bea9] hover:border-white/14 hover:bg-white/[0.03]"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
