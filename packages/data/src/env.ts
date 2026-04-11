import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

function setEnvIfMissing(key: string, value: string | undefined) {
  if (!value || process.env[key] !== undefined) {
    return;
  }

  process.env[key] = value;
}

function applySiteUrlFallbacks() {
  const railwayPublicDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();

  if (!railwayPublicDomain || process.env.EQ_SITE_URL !== undefined) {
    return;
  }

  const normalizedDomain = railwayPublicDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!normalizedDomain) {
    return;
  }

  process.env.EQ_SITE_URL = `https://${normalizedDomain}`;
}

function applyRedisFallbacks() {
  setEnvIfMissing("EQ_REDIS_URL", process.env.REDIS_URL);
}

function applyGitHubFallbacks() {
  setEnvIfMissing("EQ_GITHUB_TOKEN", process.env.GITHUB_TOKEN);
}

function applyDatabaseComponentFallbacks() {
  setEnvIfMissing("EQ_DB_HOST", process.env.MYSQLHOST);
  setEnvIfMissing("EQ_DB_PORT", process.env.MYSQLPORT);
  setEnvIfMissing("EQ_DB_NAME", process.env.MYSQLDATABASE);
  setEnvIfMissing("EQ_DB_USER", process.env.MYSQLUSER);
  setEnvIfMissing("EQ_DB_PASSWORD", process.env.MYSQLPASSWORD);
}

function applyDatabaseUrlFallbacks() {
  const connectionUrl = process.env.DATABASE_URL ?? process.env.MYSQL_URL;
  if (!connectionUrl) {
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(connectionUrl);
  } catch {
    return;
  }

  if (parsed.protocol !== "mysql:" && parsed.protocol !== "mysql2:") {
    return;
  }

  setEnvIfMissing("EQ_DB_HOST", parsed.hostname || undefined);
  setEnvIfMissing("EQ_DB_PORT", parsed.port || undefined);
  setEnvIfMissing("EQ_DB_NAME", parsed.pathname.replace(/^\//, "") || undefined);
  setEnvIfMissing("EQ_DB_USER", parsed.username ? decodeURIComponent(parsed.username) : undefined);
  setEnvIfMissing("EQ_DB_PASSWORD", parsed.password ? decodeURIComponent(parsed.password) : undefined);
}

function parseEnvFile(contents: string) {
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function loadEnvFile(filename: string) {
  let current = process.cwd();

  while (true) {
    const candidate = path.join(current, filename);
    if (fs.existsSync(candidate)) {
      parseEnvFile(fs.readFileSync(candidate, "utf8"));
      return;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return;
    }

    current = parent;
  }
}

for (const filename of [".env.local", ".env", "env.local", "env"]) {
  loadEnvFile(filename);
}

applySiteUrlFallbacks();
applyRedisFallbacks();
applyGitHubFallbacks();
applyDatabaseComponentFallbacks();
applyDatabaseUrlFallbacks();

const envSchema = z.object({
  EQ_SITE_NAME: z.string().optional().default("EQ Alla 2.0"),
  EQ_SITE_URL: z.string().optional().default("http://localhost:3000"),
  EQ_MARKET_API_BASE_URL: z
    .string()
    .optional()
    .default("https://cw-raid-manager-server-production.up.railway.app/api/market/public"),
  EQ_DB_HOST: z.string().optional(),
  EQ_DB_PORT: z.string().optional().default("3306"),
  EQ_DB_NAME: z.string().optional(),
  EQ_DB_USER: z.string().optional(),
  EQ_DB_PASSWORD: z.string().optional(),
  EQ_REDIS_URL: z.string().optional(),
  EQ_GITHUB_TOKEN: z.string().optional()
});

export const env = envSchema.parse(process.env);

export function hasDatabaseConfig() {
  return Boolean(env.EQ_DB_HOST && env.EQ_DB_NAME && env.EQ_DB_USER);
}
