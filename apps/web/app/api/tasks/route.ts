import { NextResponse } from "next/server";
import { listTasks } from "@eq-alla/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const data = listTasks(q);

  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120"
      }
    }
  );
}
