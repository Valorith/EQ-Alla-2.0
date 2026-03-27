import { NextResponse } from "next/server";
import { listItems } from "@eq-alla/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const className = searchParams.get("class") ?? undefined;
  const slot = searchParams.get("slot") ?? undefined;
  const tradeable =
    searchParams.get("tradeable") === "true"
      ? true
      : searchParams.get("tradeable") === "false"
        ? false
        : undefined;

  return NextResponse.json({ data: await listItems({ q, className, slot, tradeable }) });
}
