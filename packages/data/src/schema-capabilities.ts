import { sql } from "kysely";
import { getDb, pingDatabase } from "./db";
import { env, hasDatabaseConfig } from "./env";
import type { SchemaCapabilities } from "./types";

const knownTables = [
  "items",
  "discovered_items",
  "spells_new",
  "npc_types",
  "zone",
  "faction_list",
  "tradeskill_recipe",
  "tradeskill_recipe_entries",
  "pets",
  "tasks",
  "spawn2",
  "spawngroup",
  "spawnentry"
] as const;

export async function detectSchemaCapabilities(): Promise<SchemaCapabilities> {
  if (!hasDatabaseConfig()) {
    return {
      databaseReachable: false,
      tables: Object.fromEntries(knownTables.map((table) => [table, false]))
    };
  }

  const db = getDb();
  const reachable = await pingDatabase();

  if (!db || !reachable) {
    return {
      databaseReachable: false,
      tables: Object.fromEntries(knownTables.map((table) => [table, false]))
    };
  }

  const result = await sql<{ table_name: string }>`
    select table_name
    from information_schema.tables
    where table_schema = ${env.EQ_DB_NAME ?? ""}
  `.execute(db);

  const existing = new Set(result.rows.map((row) => row.table_name));

  return {
    databaseReachable: true,
    tables: Object.fromEntries(knownTables.map((table) => [table, existing.has(table)]))
  };
}
