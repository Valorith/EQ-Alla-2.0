import { NextResponse } from "next/server";
import { getBenchCharacterProfile, searchBenchCharacters } from "@eq-alla/data";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const query = (params.get("q") ?? "").trim();
  const headers = { "Cache-Control": "no-store" };
  if (id ? !/^[1-9]\d{0,9}$/.test(id) : !/^[a-z]{2,64}$/i.test(query)) {
    return NextResponse.json({ error: "Enter at least two letters of a character name." }, { status: 400, headers });
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      id ? getBenchCharacterProfile(Number(id)) : searchBenchCharacters(query),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Character request timed out")), 15_000); })
    ]);
    return result ? NextResponse.json(result, { headers })
      : NextResponse.json({ error: "Character not found." }, { status: 404, headers });
  } catch (error) {
    console.error("Aug Bench character request failed", { error });
    return NextResponse.json({ error: "Character equipment could not be loaded. Please retry." }, { status: 503, headers });
  } finally { clearTimeout(timer); }
}
