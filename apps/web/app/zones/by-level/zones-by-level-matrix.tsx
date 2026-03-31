"use client";

import Link from "next/link";
import { useState } from "react";
import type { ZoneByLevelSummary, ZoneLevelBand } from "@eq-alla/data";
import { Input } from "@eq-alla/ui";

type ZonesByLevelMatrixProps = {
  zones: ZoneByLevelSummary[];
  levelCap: number;
};

const defaultSelectedLevel = 25;

function bandTone(npcCount: number) {
  if (npcCount >= 20) {
    return "border-[#d5a55a]/40 bg-[#d5a55a]/18 text-[#f5d7a3]";
  }

  if (npcCount >= 10) {
    return "border-white/15 bg-white/8 text-[#eadcc5]";
  }

  if (npcCount >= 5) {
    return "border-white/10 bg-white/5 text-[#cdbda3]";
  }

  return "border-transparent bg-transparent text-[#857560]";
}

function clampLevel(value: number, maximumLevel: number) {
  return Math.max(1, Math.min(maximumLevel, value));
}

function parseLevelInput(value: string, maximumLevel: number) {
  const next = Number.parseInt(value, 10);
  if (!Number.isFinite(next)) {
    return 1;
  }

  return clampLevel(next, maximumLevel);
}

function isIdealBand(band: ZoneLevelBand | undefined) {
  return Boolean(band?.isSignificant);
}

function buildCellBoxShadow({
  selected = false,
  header = false,
  footer = false,
  hotzone = false,
  sticky = false
}: {
  selected?: boolean;
  header?: boolean;
  footer?: boolean;
  hotzone?: boolean;
  sticky?: boolean;
}) {
  const shadows: string[] = [];

  if (hotzone) {
    shadows.push("inset 0 3px 0 rgba(255,118,74,0.82)");
    shadows.push("inset 0 -3px 0 rgba(255,118,74,0.82)");
  }

  if (selected) {
    shadows.push("inset 3px 0 0 rgba(213,165,90,0.82)");
    shadows.push("inset -3px 0 0 rgba(213,165,90,0.82)");
  }

  if (header) {
    shadows.push("inset 0 3px 0 rgba(213,165,90,0.82)");
  }

  if (footer && !hotzone) {
    shadows.push("inset 0 -3px 0 rgba(213,165,90,0.82)");
  }

  if (sticky) {
    shadows.push("8px 0 18px rgba(0,0,0,0.2)");
  }

  return shadows.length > 0 ? shadows.join(", ") : undefined;
}

export function ZonesByLevelMatrix({ zones, levelCap }: ZonesByLevelMatrixProps) {
  const bands = zones[0]?.bands ?? [];
  const maximumLevel = Math.min(bands[bands.length - 1]?.maxLevel ?? levelCap, levelCap);
  const [selectedLevel, setSelectedLevel] = useState(() => clampLevel(defaultSelectedLevel, maximumLevel));

  const selectedBandIndex = Math.max(0, Math.floor((selectedLevel - 1) / 5));
  const selectedBand = bands[selectedBandIndex];
  const idealZones = zones.filter((zone) => isIdealBand(zone.bands[selectedBandIndex]));
  const selectedColumnFrame = "bg-[linear-gradient(180deg,rgba(213,165,90,0.12),rgba(213,165,90,0.05))]";
  const selectedColumnHeaderFrame = "bg-[linear-gradient(180deg,rgba(213,165,90,0.16),rgba(213,165,90,0.05))]";
  const stickyHeaderCell =
    "sticky left-0 top-0 z-40 bg-[linear-gradient(180deg,rgba(47,39,31,0.98),rgba(29,26,24,0.98))] shadow-[8px_0_18px_rgba(0,0,0,0.2)]";

  return (
    <div className="space-y-5">
      <div className="rounded-[26px] border border-[#7b603b]/22 bg-[linear-gradient(180deg,rgba(31,28,25,0.78),rgba(13,17,23,0.8))] px-5 py-5 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#d7b472]">Level target</p>
              <span className="inline-flex rounded-full border border-[#d5a55a]/26 bg-[#d5a55a]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#f0d4a3]">
                Level {selectedLevel}
              </span>
              {selectedBand ? (
                <span className="inline-flex rounded-full border border-white/12 bg-white/6 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ddd1bf]">
                  Band {selectedBand.label}
                </span>
              ) : null}
            </div>
            <p className="max-w-2xl text-sm leading-6 text-[#cbbba1]">
              Pick your current level to spotlight the zones that have meaningful creature coverage in that hunting band.
            </p>
            <input
              type="range"
              min={1}
              max={maximumLevel}
              step={1}
              value={selectedLevel}
              onChange={(event) => setSelectedLevel(parseLevelInput(event.target.value, maximumLevel))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#d5a55a]"
              aria-label="Selected level"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[112px_auto] xl:items-end">
            <label className="grid gap-2 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Exact level</span>
              <Input
                type="number"
                min={1}
                max={maximumLevel}
                value={String(selectedLevel)}
                onChange={(event) => setSelectedLevel(parseLevelInput(event.target.value, maximumLevel))}
                className="border-white/12 bg-white/10 text-white placeholder:text-white/45 focus:border-[#f0c36a] focus:bg-white/14"
              />
            </label>
            <div className="rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-sm text-[#d8ccb8]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9f8f74]">Ideal zones</p>
              <p className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-[-0.03em] text-white">{idealZones.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-visible rounded-[28px] border border-[#7b603b]/18 bg-[linear-gradient(180deg,rgba(10,14,20,0.86),rgba(13,16,22,0.8))] shadow-[0_24px_50px_rgba(0,0,0,0.28)]">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-[linear-gradient(180deg,rgba(215,164,95,0.1),rgba(255,255,255,0.02))] text-[#d7c09a]">
            <tr>
              <th className={`min-w-[220px] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] ${stickyHeaderCell}`}>Zone</th>
              <th className="min-w-[124px] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.24em]">Suggested</th>
              <th className="min-w-[110px] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.24em]">Era</th>
              {bands.map((band, index) => (
                <th
                  key={band.label}
                  className={`sticky top-0 z-30 min-w-[74px] px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    index === selectedBandIndex ? `${selectedColumnHeaderFrame} text-[#f0d4a3]` : ""
                  }`}
                  style={{
                    background:
                      index === selectedBandIndex
                        ? undefined
                        : "linear-gradient(180deg, rgba(41, 36, 31, 0.98), rgba(24, 24, 28, 0.96))",
                    boxShadow:
                      index === selectedBandIndex
                        ? buildCellBoxShadow({ selected: true, header: true })
                        : "inset 0 -1px 0 rgba(255,255,255,0.05), 0 10px 20px rgba(0,0,0,0.14)"
                  }}
                >
                  {band.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zones.map((zone, zoneIndex) => {
              const currentBand = zone.bands[selectedBandIndex];
              const isIdeal = isIdealBand(currentBand);
              const isClose = !isIdeal && zone.bands[selectedBandIndex]?.npcCount > 0;
              const rowSurface = isIdeal
                ? "bg-[linear-gradient(180deg,rgba(215,164,95,0.09),rgba(255,255,255,0.018))]"
                : isClose
                  ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.012))]"
                  : "bg-[linear-gradient(180deg,rgba(255,255,255,0.012),rgba(255,255,255,0.006))]";
              const stickyRowSurface = isIdeal
                ? "bg-[linear-gradient(180deg,rgba(63,47,30,0.98),rgba(37,31,25,0.98))]"
                : isClose
                  ? "bg-[linear-gradient(180deg,rgba(28,31,37,0.98),rgba(20,24,30,0.98))]"
                  : "bg-[linear-gradient(180deg,rgba(20,23,29,0.98),rgba(15,18,24,0.98))]";
              const isLastRow = zoneIndex === zones.length - 1;
              const zoneNameTone = zone.hotzone ? "text-[#fff3db]" : "text-[#ddcfb7]";
              const zoneNameHoverTone = zone.hotzone ? "hover:text-[#ffd18a]" : "hover:text-[#ead4aa]";
              const zoneMetaTone = zone.hotzone ? "text-[#d0b28a]" : "text-[#786b58]";

              return (
                <tr
                  key={zone.shortName}
                  className={`border-t border-white/8 align-top transition ${
                    isIdeal
                      ? rowSurface
                      : isClose
                        ? rowSurface
                        : `${rowSurface} opacity-80`
                  } hover:bg-[linear-gradient(180deg,rgba(215,164,95,0.075),rgba(255,255,255,0.02))]`}
                >
                  <td
                    className={`sticky left-0 z-20 px-4 py-3.5 text-[#efe6d5] ${stickyRowSurface}`}
                    style={{ boxShadow: buildCellBoxShadow({ hotzone: zone.hotzone, sticky: true }) }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/zones/${zone.shortName}`}
                          className={`font-semibold transition ${zoneNameTone} ${zoneNameHoverTone} hover:underline`}
                        >
                          {zone.longName}
                        </Link>
                        <div className={`mt-1 text-xs uppercase tracking-[0.18em] ${zoneMetaTone}`}>{zone.shortName}</div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {zone.hotzone ? (
                          <span className="inline-flex rounded-full border border-[#ff6b57]/70 bg-[linear-gradient(180deg,rgba(255,86,58,0.46),rgba(255,150,64,0.22))] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#fff6df] shadow-[0_0_0_1px_rgba(255,124,72,0.28),0_0_26px_rgba(255,94,58,0.28)]">
                            Hotzone
                          </span>
                        ) : null}
                        {isIdeal ? (
                          <span className="inline-flex rounded-full border border-[#d5a55a]/35 bg-[#d5a55a]/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f4dcae]">
                            Ideal
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5" style={{ boxShadow: buildCellBoxShadow({ hotzone: zone.hotzone }) }}>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        isIdeal
                          ? "border-[#d5a55a]/35 bg-[#d5a55a]/16 text-[#f4dcae]"
                          : "border-[#d5a55a]/24 bg-[#d5a55a]/10 text-[#f0d4a3]"
                      }`}
                    >
                      {zone.suggestedLevel}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-[#d8cab4]" style={{ boxShadow: buildCellBoxShadow({ hotzone: zone.hotzone }) }}>
                    {zone.era}
                  </td>
                  {zone.bands.map((band, index) => {
                    const isSelectedBand = index === selectedBandIndex;
                    const isSelectedIdeal = isSelectedBand && band.isSignificant;
                    const isSelectedPresent = isSelectedBand && band.npcCount > 0 && !band.isSignificant;
                    const cellBoxShadow = buildCellBoxShadow({
                      selected: isSelectedBand,
                      footer: isSelectedBand && isLastRow,
                      hotzone: zone.hotzone
                    });

                    return (
                      <td
                        key={`${zone.shortName}-${band.label}`}
                        className={`px-2 py-3 text-center ${isSelectedBand ? selectedColumnFrame : ""}`}
                        style={cellBoxShadow ? { boxShadow: cellBoxShadow } : undefined}
                      >
                        {band.npcCount > 0 ? (
                          <span
                            className={`inline-flex min-w-[42px] items-center justify-center rounded-full border px-2 py-1 text-xs font-semibold ${
                              isSelectedIdeal
                                ? "border-[#f0cc8a] bg-[#d5a55a]/26 text-[#fff2d1] shadow-[0_0_0_1px_rgba(240,204,138,0.35)]"
                                : isSelectedPresent
                                  ? "border-[#d5a55a]/24 bg-[#d5a55a]/10 text-[#ead8b6]"
                                  : bandTone(band.npcCount)
                            }`}
                          >
                            {band.npcCount}
                          </span>
                        ) : (
                          <span className={`inline-block h-2 w-2 rounded-full ${isSelectedBand ? "bg-[#d5a55a]/25" : "bg-white/5"}`} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
