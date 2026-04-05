import { NextResponse } from "next/server";
import { listItems } from "@eq-alla/data";

const itemSearchRouteTimeoutMs = 15_000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const classNames = searchParams.getAll("class").filter(Boolean);
  const slots = searchParams.getAll("slot").filter(Boolean);
  const type = searchParams.get("type") ?? undefined;
  const minLevel = searchParams.get("minLevel") ? Number(searchParams.get("minLevel")) : undefined;
  const maxLevel = searchParams.get("maxLevel") ? Number(searchParams.get("maxLevel")) : undefined;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    const data = await Promise.race([
      listItems({ q, classNames, slots, type, minLevel, maxLevel }),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(`Item search timed out after ${itemSearchRouteTimeoutMs}ms`)), itemSearchRouteTimeoutMs);
      })
    ]);

    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=120"
        }
      }
    );
  } catch (error) {
    const isTimeout = error instanceof Error && error.message.includes("timed out");

    console.error("Item search request failed", {
      q,
      classNames,
      slots,
      type,
      minLevel,
      maxLevel,
      error
    });

    return NextResponse.json(
      {
        error: isTimeout ? "Item search timed out." : "Item search failed."
      },
      {
        status: isTimeout ? 504 : 500,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}
