import { NextResponse } from "next/server";
import { listRecipes } from "@eq-alla/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const tradeskill = searchParams.get("tradeskill") ?? undefined;
  const minTrivial = Number(searchParams.get("minTrivial") ?? "") || undefined;
  const maxTrivial = Number(searchParams.get("maxTrivial") ?? "") || undefined;
  const data = await listRecipes({ q, tradeskill, minTrivial, maxTrivial });

  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120"
      }
    }
  );
}
