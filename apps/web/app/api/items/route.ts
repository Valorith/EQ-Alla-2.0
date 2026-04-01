import { NextResponse } from "next/server";
import { listItems } from "@eq-alla/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const classNames = searchParams.getAll("class").filter(Boolean);
  const slots = searchParams.getAll("slot").filter(Boolean);
  const type = searchParams.get("type") ?? undefined;
  const minLevel = searchParams.get("minLevel") ? Number(searchParams.get("minLevel")) : undefined;
  const maxLevel = searchParams.get("maxLevel") ? Number(searchParams.get("maxLevel")) : undefined;
  const data = await listItems({ q, classNames, slots, type, minLevel, maxLevel });

  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120"
      }
    }
  );
}
