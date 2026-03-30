import { NextResponse } from "next/server";
import { listFactions } from "@eq-alla/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const zone = searchParams.get("zone") ?? undefined;
  const relationship = searchParams.get("relationship") ?? undefined;
  const data = await listFactions({
    q,
    zone,
    relationship: relationship === "raises" || relationship === "lowers" || relationship === "both" || relationship === "none" ? relationship : undefined
  });

  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120"
      }
    }
  );
}
