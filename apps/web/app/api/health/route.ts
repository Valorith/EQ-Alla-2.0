import { NextResponse } from "next/server";
import { env, getSourceMode, hasDatabaseConfig, pingDatabase } from "@eq-alla/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const databaseConfigured = hasDatabaseConfig();
  const databaseReachable = databaseConfigured ? await pingDatabase() : false;
  const ok = databaseReachable;
  const mode = getSourceMode();

  return NextResponse.json(
    {
      ok,
      mode,
      checks: {
        database: {
          required: true,
          configured: databaseConfigured,
          reachable: databaseReachable
        },
        redis: {
          required: false,
          configured: Boolean(env.EQ_REDIS_URL)
        }
      }
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
