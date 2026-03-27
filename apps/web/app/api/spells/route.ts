import { NextResponse } from "next/server";
import { listSpells } from "@eq-alla/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const className = searchParams.get("class") ?? undefined;
  const level = searchParams.get("level") ? Number(searchParams.get("level")) : undefined;

  return NextResponse.json({ data: await listSpells({ q, className, level }) });
}
