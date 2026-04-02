"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button, Input } from "@eq-alla/ui";

type StationZone = {
  shortName: string;
  longName: string;
  href: string;
};

type StationAccess = {
  slug: string;
  label: string;
  zones: StationZone[];
};

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function includesQuery(value: string, normalizedQuery: string) {
  return value.toLowerCase().includes(normalizedQuery);
}

const pageSize = 10;

export function RecipeStationAccess({ stations }: { stations: StationAccess[] }) {
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState<Record<string, number>>({});

  useEffect(() => {
    setPages({});
  }, [query, stations]);

  const normalizedQuery = query.trim().toLowerCase();

  const stationViews = useMemo(() => {
    return stations
      .map((station) => {
        const filteredZones = normalizedQuery
          ? station.zones.filter(
              (zone) =>
                includesQuery(zone.longName, normalizedQuery) || includesQuery(zone.shortName, normalizedQuery)
            )
          : station.zones;

        return {
          ...station,
          filteredZones
        };
      })
      .filter((station) => !normalizedQuery || station.filteredZones.length > 0);
  }, [normalizedQuery, stations]);

  if (stations.length === 0) {
    return (
      <div className="rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(13,17,24,0.92),rgba(8,11,16,0.96))] px-5 py-4 sm:px-6">
        <p className="text-sm leading-7 text-[var(--foreground)]/78">
          This recipe does not expose a workbench type that can be matched to public placed crafting stations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(13,17,24,0.92),rgba(8,11,16,0.96))] px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter station zones by name..."
            aria-label="Filter station zones by name"
            className="h-10 max-w-xl rounded-xl border-white/12 bg-white/8 px-4 text-[#efe7d8] placeholder:text-[#9f8e79] focus:border-[#d7a45f] focus:bg-white/10"
          />
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8f836f]">
            {query.trim().length > 0
              ? `${formatCount(stationViews.reduce((sum, station) => sum + station.filteredZones.length, 0))} matches`
              : `${formatCount(stations.reduce((sum, station) => sum + station.zones.length, 0))} zones`}
          </p>
        </div>
      </div>

      {stationViews.length > 0 ? (
        <div className="space-y-4">
          {stationViews.map((station) => {
            const currentPage = pages[station.slug] ?? 1;
            const totalPages = Math.max(1, Math.ceil(station.filteredZones.length / pageSize));
            const safePage = Math.min(currentPage, totalPages);
            const startIndex = (safePage - 1) * pageSize;
            const pagedZones = station.filteredZones.slice(startIndex, startIndex + pageSize);
            const start = station.filteredZones.length > 0 ? startIndex + 1 : 0;
            const end = Math.min(startIndex + pageSize, station.filteredZones.length);

            return (
              <section
                key={station.slug}
                className="overflow-hidden rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(13,17,24,0.92),rgba(8,11,16,0.96))]"
              >
                <div className="border-b border-white/10 px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b99a67]">Required Station</p>
                      <h2 className="mt-1 font-[var(--font-display)] text-[1.4rem] font-semibold tracking-[-0.03em] text-white">
                        {station.label}
                      </h2>
                    </div>
                    <span className="rounded-full border border-white/14 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d8c19a]">
                      {station.filteredZones.length} zone{station.filteredZones.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                <div className="px-5 py-4 sm:px-6">
                  {station.filteredZones.length > 0 ? (
                    <div className="divide-y divide-white/8">
                      {pagedZones.map((zone) => (
                        <Link
                          key={zone.shortName}
                          href={zone.href}
                          className="group flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold text-[#ede4d3] transition group-hover:text-white">{zone.longName}</p>
                            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8d7f6b]">{zone.shortName}</p>
                          </div>
                          <ArrowRight className="size-4 shrink-0 text-[#7e7364] transition group-hover:translate-x-0.5 group-hover:text-[#dbc083]" />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-7 text-[var(--foreground)]/78">
                      No zones match the current filter for this station type.
                    </p>
                  )}
                </div>

                {station.filteredZones.length > pageSize ? (
                  <div className="flex flex-col gap-3 border-t border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8f836f]">
                      Showing {start}-{end} of {formatCount(station.filteredZones.length)}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-lg border border-white/8 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#c8bea9] hover:border-white/14 hover:bg-white/[0.03]"
                        onClick={() =>
                          setPages((current) => ({ ...current, [station.slug]: Math.max(1, safePage - 1) }))
                        }
                        disabled={safePage === 1}
                      >
                        Prev
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-lg border border-white/8 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#c8bea9] hover:border-white/14 hover:bg-white/[0.03]"
                        onClick={() =>
                          setPages((current) => ({ ...current, [station.slug]: Math.min(totalPages, safePage + 1) }))
                        }
                        disabled={safePage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(13,17,24,0.92),rgba(8,11,16,0.96))] px-5 py-4 sm:px-6">
          <p className="text-sm leading-7 text-[var(--foreground)]/78">No station-access zones match the current filter.</p>
        </div>
      )}
    </div>
  );
}
