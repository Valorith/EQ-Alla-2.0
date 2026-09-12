import { NextResponse } from "next/server";
import { getAugmentCatalog } from "@eq-alla/data";

export async function GET() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const data = await Promise.race([
      getAugmentCatalog(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Aug Bench database request timed out")), 15_000); })
    ]);
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch (error) {
    console.error("Aug Bench data request failed", { error });
    return NextResponse.json({ error: "The server item database could not be reached. Please retry." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  } finally {
    clearTimeout(timer);
  }
}
