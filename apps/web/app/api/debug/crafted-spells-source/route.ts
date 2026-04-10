import { NextResponse } from "next/server";
import { getCraftedSpellCatalog } from "@eq-alla/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await getCraftedSpellCatalog();
  const fetchedAt = Date.parse(catalog.source.fetchedAt);
  const ageSeconds = Number.isFinite(fetchedAt) ? Math.max(0, Math.floor((Date.now() - fetchedAt) / 1_000)) : null;
  const staleAfterSeconds = catalog.source.cacheTtlSeconds;

  return NextResponse.json(
    {
      source: catalog.source,
      status: {
        ageSeconds,
        staleAfterSeconds,
        stale: ageSeconds === null ? true : ageSeconds >= staleAfterSeconds
      },
      summary: catalog.summary
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
