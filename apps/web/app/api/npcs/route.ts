import { NextResponse } from "next/server";
import { listNpcs } from "@eq-alla/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? searchParams.get("name") ?? undefined;
  const zone = searchParams.get("zone") ?? undefined;
  const race = searchParams.get("race") ?? undefined;
  const minLevel = searchParams.get("minLevel") ? Number(searchParams.get("minLevel")) : undefined;
  const maxLevel = searchParams.get("maxLevel") ? Number(searchParams.get("maxLevel")) : undefined;
  const named = searchParams.get("named") === "true" ? true : undefined;

  return NextResponse.json({ data: await listNpcs({ q, zone, race, minLevel, maxLevel, named }) });
}
