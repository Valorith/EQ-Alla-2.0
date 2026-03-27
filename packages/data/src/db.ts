import { Kysely, MysqlDialect, sql } from "kysely";
import mysql from "mysql2";
import { env, hasDatabaseConfig } from "./env";

let db: Kysely<Record<string, unknown>> | null = null;

export function getDb() {
  if (!hasDatabaseConfig()) {
    return null;
  }

  if (!db) {
    db = new Kysely<Record<string, unknown>>({
      dialect: new MysqlDialect({
        pool: mysql.createPool({
          host: env.EQ_DB_HOST,
          port: Number(env.EQ_DB_PORT),
          database: env.EQ_DB_NAME,
          user: env.EQ_DB_USER,
          password: env.EQ_DB_PASSWORD,
          connectionLimit: 5
        })
      })
    });
  }

  return db;
}

export async function pingDatabase() {
  const connection = getDb();
  if (!connection) {
    return false;
  }

  try {
    await sql`select 1`.execute(connection);
    return true;
  } catch {
    return false;
  }
}

