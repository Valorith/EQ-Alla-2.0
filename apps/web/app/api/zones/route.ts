import { NextResponse } from "next/server";
import { listZones } from "@eq-alla/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const era = searchParams.get("era") ?? undefined;

  return NextResponse.json({ data: await listZones({ q, era }) });
}
