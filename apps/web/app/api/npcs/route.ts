import { NextResponse } from "next/server";
import { listNpcs } from "@eq-alla/data";

function optionalNumber(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? searchParams.get("name") ?? undefined;
  const zone = searchParams.get("zone") ?? undefined;
  const race = searchParams.get("race") ?? undefined;
  const className = searchParams.get("class") ?? undefined;
  const bodyType = searchParams.get("bodyType") ?? undefined;
  const minLevel = optionalNumber(searchParams, "minLevel");
  const maxLevel = optionalNumber(searchParams, "maxLevel");
  const minHp = optionalNumber(searchParams, "minHp");
  const maxHp = optionalNumber(searchParams, "maxHp");
  const namedParam = searchParams.get("named");
  const named = namedParam === "true" ? true : namedParam === "false" ? false : undefined;
  const merchantParam = searchParams.get("merchant");
  const merchant = merchantParam === "true" ? true : merchantParam === "false" ? false : undefined;
  const data = await listNpcs({ q, zone, race, className, bodyType, minLevel, maxLevel, minHp, maxHp, named, merchant });

  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120"
      }
    }
  );
}
