import { NextResponse } from "next/server";
import { listSpells } from "@eq-alla/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const className = searchParams.get("class") ?? undefined;
  const level = searchParams.get("level") ? Number(searchParams.get("level")) : undefined;
  const levelModeParam = searchParams.get("levelMode");
  const levelMode = levelModeParam === "min" || levelModeParam === "max" || levelModeParam === "exact" ? levelModeParam : undefined;
  const data = await listSpells({ q, className, level, levelMode });

  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120"
      }
    }
  );
}
