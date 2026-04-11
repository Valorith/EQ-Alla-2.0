import { z } from "zod";
import { cacheGetOrResolve } from "./cache";
import { env } from "./env";
import type { ItemMarketData } from "./types";

const itemMarketDataCacheTtlSeconds = 300;
const itemMarketDataDefaultRangeDays = 180;
const itemMarketRequestTimeoutMs = 5_000;

const marketHistoryStatsSchema = z.object({
  totalSales: z.number(),
  totalUnitsSold: z.number(),
  totalRevenue: z.number(),
  averagePrice: z.number(),
  minPrice: z.number(),
  maxPrice: z.number(),
  lastSoldAt: z.string().nullable().optional()
});

const marketPricePointSchema = z.object({
  occurredAt: z.string(),
  price: z.number(),
  quantity: z.number(),
  totalCost: z.number()
});

const marketDailyTrendSchema = z.object({
  saleDate: z.string(),
  salesCount: z.number(),
  unitsSold: z.number(),
  averagePrice: z.number(),
  minPrice: z.number(),
  maxPrice: z.number(),
  totalRevenue: z.number()
});

const marketRecentSaleSchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  itemId: z.number(),
  itemName: z.string(),
  itemIconId: z.number(),
  price: z.number(),
  quantity: z.number(),
  charges: z.number(),
  totalCost: z.number(),
  sellerCharacterId: z.number(),
  sellerCharacterName: z.string(),
  buyerCharacterId: z.number(),
  buyerCharacterName: z.string(),
  itemAveragePrice: z.number()
});

const marketListingSchema = z.object({
  sellerCharacterId: z.number(),
  sellerCharacterName: z.string(),
  itemId: z.number(),
  itemName: z.string(),
  itemIconId: z.number(),
  itemSlots: z.number(),
  itemAveragePrice: z.number(),
  price: z.number(),
  priceRank: z.number(),
  charges: z.number(),
  slotId: z.number(),
  listedAt: z.string()
});

const itemMarketDataSchema = z.object({
  itemId: z.number(),
  rangeDays: z.number(),
  hasMarketData: z.boolean(),
  hasSalesHistory: z.boolean(),
  hasActiveListings: z.boolean(),
  history: z
    .object({
      itemId: z.number(),
      itemName: z.string(),
      itemIconId: z.number(),
      rangeDays: z.number(),
      stats: marketHistoryStatsSchema,
      pricePoints: z.array(marketPricePointSchema),
      dailyTrend: z.array(marketDailyTrendSchema),
      recentSales: z.array(marketRecentSaleSchema)
    })
    .nullable()
    .optional(),
  listings: z
    .object({
      listings: z.array(marketListingSchema),
      summary: z.object({
        totalListings: z.number(),
        distinctSellers: z.number(),
        distinctItems: z.number(),
        newestListingAt: z.string().nullable().optional()
      }),
      page: z.number(),
      pageSize: z.number(),
      total: z.number(),
      totalPages: z.number(),
      sourceAvailable: z.boolean(),
      message: z.string().nullable().optional(),
      syncStatus: z
        .object({
          lastRetrievedAt: z.string().nullable().optional()
        })
        .nullable()
        .optional()
    })
    .nullable()
    .optional(),
  message: z.string().nullable().optional()
});

function normalizeMarketBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function buildMarketRequestUrl(itemId: number, rangeDays: number) {
  const url = new URL(`${normalizeMarketBaseUrl(env.EQ_MARKET_API_BASE_URL)}/items/${itemId}`);
  url.searchParams.set("rangeDays", String(rangeDays));
  return url;
}

function createEmptyMarketData(itemId: number, rangeDays: number, message?: string): ItemMarketData {
  return {
    itemId,
    rangeDays,
    hasMarketData: false,
    hasSalesHistory: false,
    hasActiveListings: false,
    history: null,
    listings: null,
    message
  };
}

export async function getItemMarketData(itemId: number, rangeDays = itemMarketDataDefaultRangeDays): Promise<ItemMarketData | null> {
  if (!Number.isFinite(itemId) || itemId <= 0) {
    return null;
  }

  const normalizedRangeDays = Number.isFinite(rangeDays) && rangeDays > 0 ? Math.round(rangeDays) : itemMarketDataDefaultRangeDays;
  const cacheKey = `item-market:${itemId}:${normalizedRangeDays}`;

  try {
    return await cacheGetOrResolve(cacheKey, itemMarketDataCacheTtlSeconds, async () => {
      const response = await fetch(buildMarketRequestUrl(itemId, normalizedRangeDays), {
        headers: {
          Accept: "application/json"
        },
        signal: AbortSignal.timeout(itemMarketRequestTimeoutMs)
      });

      if (response.status === 404) {
        return createEmptyMarketData(itemId, normalizedRangeDays, `No CW Nexus market data was found in the last ${normalizedRangeDays} days.`);
      }

      if (!response.ok) {
        throw new Error(`Market API request failed with ${response.status}`);
      }

      const payload = itemMarketDataSchema.parse(await response.json());
      return {
        ...payload,
        history: payload.history ?? null,
        listings: payload.listings ?? null
      };
    });
  } catch {
    return null;
  }
}
