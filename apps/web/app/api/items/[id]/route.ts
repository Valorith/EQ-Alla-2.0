import { NextResponse } from "next/server";
import { getItemAvailability, getItemDetail } from "@eq-alla/data";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const itemId = Number(id);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json({ error: "Not found", code: "ITEM_NOT_FOUND" }, { status: 404 });
  }

  const availability = await getItemAvailability(itemId);

  if (availability === "missing") {
    return NextResponse.json({ error: "Not found", code: "ITEM_NOT_FOUND" }, { status: 404 });
  }

  if (availability === "undiscovered") {
    return NextResponse.json(
      {
        error: "This item cannot be viewed yet because it has not been discovered.",
        code: "ITEM_UNDISCOVERED"
      },
      { status: 403 }
    );
  }

  const data = await getItemDetail(itemId);

  if (!data) {
    return NextResponse.json({ error: "Not found", code: "ITEM_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120"
      }
    }
  );
}
