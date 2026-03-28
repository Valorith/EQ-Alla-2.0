import { NextResponse } from "next/server";
import { listItems } from "@eq-alla/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const className = searchParams.get("class") ?? undefined;
  const slot = searchParams.get("slot") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const minLevel = searchParams.get("minLevel") ? Number(searchParams.get("minLevel")) : undefined;
  const maxLevel = searchParams.get("maxLevel") ? Number(searchParams.get("maxLevel")) : undefined;
  const tradeable =
    searchParams.get("tradeable") === "true"
      ? true
      : searchParams.get("tradeable") === "false"
        ? false
        : undefined;
  const data = await listItems({ q, className, slot, type, minLevel, maxLevel, tradeable });

  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120"
      }
    }
  );
}
