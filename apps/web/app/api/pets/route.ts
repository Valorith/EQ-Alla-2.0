import { NextResponse } from "next/server";
import { listPets } from "@eq-alla/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const className = searchParams.get("class") ?? undefined;
  const data = await listPets({ className });

  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120"
      }
    }
  );
}
