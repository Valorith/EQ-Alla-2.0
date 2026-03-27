import { NextResponse } from "next/server";
import { detectSchemaCapabilities, getCatalogStats, getSourceMode } from "@eq-alla/data";

export async function GET() {
  const capabilities = await detectSchemaCapabilities();
  const stats = await getCatalogStats();

  return NextResponse.json({
    ok: true,
    mode: getSourceMode(),
    stats,
    capabilities
  });
}
