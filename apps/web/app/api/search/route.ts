import { NextResponse } from "next/server";
import { searchCatalog } from "@eq-alla/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  return NextResponse.json({ data: q ? await searchCatalog(q) : [] });
}

