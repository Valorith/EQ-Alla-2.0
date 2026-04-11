import { afterEach, describe, expect, it, vi } from "vitest";
import { getItemMarketData } from "./market";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("item market data", () => {
  it("loads and caches CW Nexus market payloads", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          itemId: 150767,
          rangeDays: 180,
          hasMarketData: true,
          hasSalesHistory: true,
          hasActiveListings: true,
          history: {
            itemId: 150767,
            itemName: "Ceylyelite of Extension",
            itemIconId: 1984,
            rangeDays: 180,
            stats: {
              totalSales: 4,
              totalUnitsSold: 4,
              totalRevenue: 1620000,
              averagePrice: 405000,
              minPrice: 360000,
              maxPrice: 450000,
              lastSoldAt: "2026-04-10T22:22:51.000Z"
            },
            pricePoints: [
              {
                occurredAt: "2026-04-10T22:22:51.000Z",
                price: 360000,
                quantity: 1,
                totalCost: 360000
              }
            ],
            dailyTrend: [
              {
                saleDate: "2026-04-10",
                salesCount: 2,
                unitsSold: 2,
                averagePrice: 360000,
                minPrice: 360000,
                maxPrice: 360000,
                totalRevenue: 720000
              }
            ],
            recentSales: [
              {
                id: "sale-1",
                occurredAt: "2026-04-10T22:22:51.000Z",
                itemId: 150767,
                itemName: "Ceylyelite of Extension",
                itemIconId: 1984,
                price: 360000,
                quantity: 1,
                charges: 16,
                totalCost: 360000,
                sellerCharacterId: 6999,
                sellerCharacterName: "Deaugmenter",
                buyerCharacterId: 4939,
                buyerCharacterName: "Derdrood",
                itemAveragePrice: 405000
              }
            ]
          },
          listings: {
            listings: [
              {
                sellerCharacterId: 6999,
                sellerCharacterName: "Deaugmenter",
                itemId: 150767,
                itemName: "Ceylyelite of Extension",
                itemIconId: 1984,
                itemSlots: 1048904,
                itemAveragePrice: 405000,
                price: 360000,
                priceRank: 1,
                charges: 15,
                slotId: 33,
                listedAt: "2026-04-10T22:22:51.000Z"
              }
            ],
            summary: {
              totalListings: 1,
              distinctSellers: 1,
              distinctItems: 1,
              newestListingAt: "2026-04-10T22:22:51.000Z"
            },
            page: 1,
            pageSize: 10,
            total: 1,
            totalPages: 1,
            sourceAvailable: true,
            message: null,
            syncStatus: {
              lastRetrievedAt: "2026-04-11T02:54:11.389Z"
            }
          },
          message: null
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    globalThis.fetch = fetchMock as typeof fetch;

    const first = await getItemMarketData(150767);
    const second = await getItemMarketData(150767);

    expect(first?.history?.stats.averagePrice).toBe(405000);
    expect(first?.listings?.summary.totalListings).toBe(1);
    expect(second?.history?.recentSales[0]?.sellerCharacterName).toBe("Deaugmenter");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns an empty market payload on 404 responses", async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 404 })) as typeof fetch;

    const result = await getItemMarketData(987654321);

    expect(result).toMatchObject({
      itemId: 987654321,
      hasMarketData: false,
      hasSalesHistory: false,
      hasActiveListings: false,
      history: null,
      listings: null
    });
    expect(result?.message).toContain("No CW Nexus market data");
  });
});
