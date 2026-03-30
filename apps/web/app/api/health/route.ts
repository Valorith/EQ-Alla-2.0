import { NextResponse } from "next/server";
import { env, getSourceMode, hasDatabaseConfig, pingDatabase, useMockData } from "@eq-alla/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const mockData = useMockData();
  const databaseConfigured = hasDatabaseConfig();
  const databaseReachable = mockData ? true : databaseConfigured ? await pingDatabase() : false;
  const ok = mockData || databaseReachable;
  const mode = mockData ? "mock" : getSourceMode();

  return NextResponse.json(
    {
      ok,
      mode,
      checks: {
        database: {
          required: !mockData,
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
