import { NextResponse } from "next/server";
import { listPets } from "@eq-alla/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const classesParam = searchParams.get("classes");
  const legacyClass = searchParams.get("class");
  const classNames = classesParam
    ? classesParam.split(",").map((entry) => entry.trim()).filter(Boolean)
    : legacyClass
      ? [legacyClass]
      : [];
  const data = await listPets({ classNames, className: classNames[0] });

  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120"
      }
    }
  );
}
