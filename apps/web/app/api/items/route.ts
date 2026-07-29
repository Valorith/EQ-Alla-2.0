import { NextResponse } from "next/server";
import { listItems } from "@eq-alla/data";

const itemSearchRouteTimeoutMs = 15_000;

function optionalNumber(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const classNames = searchParams.getAll("class").filter(Boolean);
  const races = searchParams.getAll("race").filter(Boolean);
  const slots = searchParams.getAll("slot").filter(Boolean);
  const type = searchParams.get("type") ?? undefined;
  const source = searchParams.get("source") ?? undefined;
  const tradeableParam = searchParams.get("tradeable");
  const tradeable = tradeableParam === "true" ? true : tradeableParam === "false" ? false : undefined;
  const minLevel = optionalNumber(searchParams, "minLevel");
  const maxLevel = optionalNumber(searchParams, "maxLevel");
  const minAc = optionalNumber(searchParams, "minAc");
  const minHp = optionalNumber(searchParams, "minHp");
  const minMana = optionalNumber(searchParams, "minMana");
  const minDamage = optionalNumber(searchParams, "minDamage");
  const maxDelay = optionalNumber(searchParams, "maxDelay");
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    const data = await Promise.race([
      listItems({
        q,
        classNames,
        races,
        slots,
        type,
        source,
        tradeable,
        minLevel,
        maxLevel,
        minAc,
        minHp,
        minMana,
        minDamage,
        maxDelay
      }),
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
      races,
      slots,
      type,
      source,
      tradeable,
      minLevel,
      maxLevel,
      minAc,
      minHp,
      minMana,
      minDamage,
      maxDelay,
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
