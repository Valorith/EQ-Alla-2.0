"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import type { ItemMarketData } from "@eq-alla/data";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { CoinDisplay } from "./coin-display";

function copperToCoinValue(totalCopper: number) {
  const normalized = Math.max(0, Math.round(totalCopper));

  return {
    pp: Math.floor(normalized / 1000),
    gp: Math.floor((normalized % 1000) / 100),
    sp: Math.floor((normalized % 100) / 10),
    cp: normalized % 10
  };
}

function copperToLabel(totalCopper: number) {
  const v = copperToCoinValue(totalCopper);
  const parts: string[] = [];
  if (v.pp > 0) parts.push(`${v.pp}pp`);
  if (v.gp > 0) parts.push(`${v.gp}gp`);
  if (v.sp > 0) parts.push(`${v.sp}sp`);
  if (v.cp > 0) parts.push(`${v.cp}cp`);
  return parts.length > 0 ? parts.join(" ") : "0cp";
}

function copperToShortLabel(totalCopper: number) {
  if (totalCopper >= 1000) {
    const pp = totalCopper / 1000;
    const rounded = Math.round(pp * 10) / 10;
    return rounded === Math.floor(rounded) ? `${rounded}pp` : `${rounded.toFixed(1)}pp`;
  }
  if (totalCopper >= 100) {
    const gp = totalCopper / 100;
    const rounded = Math.round(gp * 10) / 10;
    return rounded === Math.floor(rounded) ? `${rounded}gp` : `${rounded.toFixed(1)}gp`;
  }
  if (totalCopper >= 10) {
    const sp = totalCopper / 10;
    const rounded = Math.round(sp * 10) / 10;
    return rounded === Math.floor(rounded) ? `${rounded}sp` : `${rounded.toFixed(1)}sp`;
  }
  return `${Math.round(totalCopper)}cp`;
}

function formatDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    options ?? {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  ).format(parsed);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function StatPill({
  label,
  value,
  detail
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <div className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] rounded-[10px] border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9e8b6a]">{label}</p>
      <div className="mt-1 text-[14px] font-semibold leading-5 text-[#f2ead9]">{value}</div>
      {detail ? <p className="mt-0.5 text-[11px] leading-4 text-[#7a8599]">{detail}</p> : null}
    </div>
  );
}

type ChartDataPoint = {
  date: string;
  dateLabel: string;
  avg: number;
  min: number;
  max: number;
  sales: number;
};

function buildChartData(market: ItemMarketData): ChartDataPoint[] {
  const dailyTrend = market.history?.dailyTrend ?? [];
  if (dailyTrend.length === 0) return [];

  return dailyTrend
    .map((d) => ({
      date: d.saleDate,
      dateLabel: formatDate(d.saleDate, { month: "short", day: "numeric" }),
      avg: Math.round(d.averagePrice),
      min: Math.round(d.minPrice),
      max: Math.round(d.maxPrice),
      sales: d.unitsSold || d.salesCount
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;

  const avg = payload.find((p) => p.dataKey === "avg")?.value ?? 0;
  const min = payload.find((p) => p.dataKey === "min")?.value ?? 0;
  const max = payload.find((p) => p.dataKey === "max")?.value ?? 0;
  const sales = payload.find((p) => p.dataKey === "sales")?.value ?? 0;

  return (
    <div className="rounded-[10px] border border-white/15 bg-[rgba(14,19,27,0.96)] px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
      <p className="text-[11px] font-semibold text-[#ddd2b5]">{label}</p>
      <div className="mt-1.5 space-y-1 text-[12px]">
        <p className="text-[#f2ead9]">
          <span className="text-[#98a5b8]">Avg: </span>{copperToLabel(avg)}
        </p>
        {min !== max && (
          <p className="text-[#f2ead9]">
            <span className="text-[#98a5b8]">Range: </span>{copperToLabel(min)} – {copperToLabel(max)}
          </p>
        )}
        {sales > 0 && (
          <p className="text-[#f2ead9]">
            <span className="text-[#98a5b8]">Sold: </span>{sales} units
          </p>
        )}
      </div>
    </div>
  );
}

function PriceHistoryChart({ data }: { data: ChartDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-[10px] border border-dashed border-white/10 bg-white/[0.02]">
        <p className="text-[14px] text-[#7a8599]">No price history available for chart</p>
      </div>
    );
  }

  const allPrices = data.flatMap((d) => [d.min, d.max, d.avg]);
  const dataMin = Math.min(...allPrices);
  const dataMax = Math.max(...allPrices);
  const range = dataMax - dataMin;

  const stepOptions = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
  const targetSteps = 4;
  const rawStep = Math.max(range, 1) / targetSteps;
  const step = stepOptions.find((s) => s >= rawStep) ?? Math.ceil(rawStep / 1000) * 1000;

  const yMin = Math.max(0, Math.floor(dataMin / step) * step);
  const yMax = Math.ceil(dataMax / step) * step;
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax; v += step) {
    ticks.push(v);
  }
  const longestLabel = Math.max(...ticks.map((t) => copperToShortLabel(t).length));
  const yAxisWidth = Math.max(36, longestLabel * 7 + 4);

  return (
    <div className="h-[220px] w-full sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d1ad6b" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#d1ad6b" stopOpacity={0.02} />
            </linearGradient>

          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: "#7a8599", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            domain={[yMin, yMax]}
            ticks={ticks}
            tick={{ fill: "#7a8599", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => copperToShortLabel(v)}
            width={yAxisWidth}
          />
          <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: "rgba(209,173,107,0.2)", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="avg"
            stroke="#d1ad6b"
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#d1ad6b", stroke: "#0e131b", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ItemMarketCard({
  itemName,
  market
}: {
  itemName: string;
  market: ItemMarketData | null;
}) {
  const lowestListing = useMemo(() => {
    const sorted = [...(market?.listings?.listings ?? [])].sort((left, right) => left.price - right.price || left.priceRank - right.priceRank);
    return sorted[0] ?? null;
  }, [market?.listings?.listings]);
  const lastSale = market?.history?.recentSales?.[0] ?? null;
  const averagePrice = market?.history?.stats.averagePrice ?? 0;
  const totalSales = market?.history?.stats.totalSales ?? 0;
  const totalUnitsSold = market?.history?.stats.totalUnitsSold ?? 0;
  const hasAnyMarketData = Boolean(market && (market.hasSalesHistory || market.hasActiveListings));

  const chartData = useMemo(() => (market ? buildChartData(market) : []), [market]);

  return (
    <section className="h-full min-w-0 rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(23,29,38,0.96),rgba(14,19,27,0.94))] shadow-[0_18px_40px_rgba(0,0,0,0.3)] backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/8 px-5 py-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b99a67]">CW Nexus Market</p>
          <h3 className="text-[20px] font-medium leading-tight tracking-[-0.03em] text-[#f2ead9]">Price History</h3>
          <p className="max-w-[34ch] text-[13px] leading-5 text-[#aeb8ca]">{itemName}</p>
        </div>
        <div className="rounded-full border border-[#d1ad6b]/25 bg-[#d1ad6b]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e6d1a6]">
          {market?.rangeDays ?? 180} days
        </div>
      </div>

      {hasAnyMarketData ? (
        <div className="space-y-0">
          {/* Stats strip */}
          <div className="flex flex-wrap gap-2 border-b border-white/8 px-5 py-3">
            <StatPill
              label="Avg Sale"
              value={averagePrice > 0 ? <CoinDisplay value={copperToCoinValue(averagePrice)} /> : "—"}
              detail={totalSales > 0 ? `${formatNumber(totalSales)} sales / ${formatNumber(totalUnitsSold)} units` : undefined}
            />
            <StatPill
              label="Last Sale"
              value={lastSale ? <CoinDisplay value={copperToCoinValue(lastSale.totalCost)} /> : "—"}
              detail={lastSale ? `${formatNumber(lastSale.quantity)} sold • ${formatDate(lastSale.occurredAt, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}` : undefined}
            />
            <StatPill
              label="Lowest Listing"
              value={lowestListing ? <CoinDisplay value={copperToCoinValue(lowestListing.price)} /> : "—"}
              detail={lowestListing ? `${lowestListing.sellerCharacterName} • ${lowestListing.charges} charges` : undefined}
            />
            <StatPill
              label="Active Listings"
              value={formatNumber(market?.listings?.summary.totalListings ?? 0)}
              detail={
                market?.listings
                  ? `${formatNumber(market.listings.summary.distinctSellers)} sellers`
                  : undefined
              }
            />
          </div>

          {/* Chart */}
          <div className="px-5 py-4">
            <PriceHistoryChart data={chartData} />
          </div>
        </div>
      ) : (
        <div className="px-5 py-4">
          <div className="rounded-[10px] border border-dashed border-white/10 bg-white/[0.025] px-4 py-4">
            <p className="text-[15px] leading-6 text-[#d7deea]">
              {market?.message ?? "CW Nexus market data is temporarily unavailable for this item."}
            </p>
            <p className="mt-2 text-[13px] leading-5 text-[#98a5b8]">
              The item page still renders normally when the external market service has no activity or cannot be reached.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
