import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

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

const envSchema = z.object({
  EQ_USE_MOCK_DATA: z.string().optional().default("true"),
  EQ_SITE_NAME: z.string().optional().default("EQ Alla 2.0"),
  EQ_SITE_URL: z.string().optional().default("http://localhost:3000"),
  EQ_DB_HOST: z.string().optional(),
  EQ_DB_PORT: z.string().optional().default("3306"),
  EQ_DB_NAME: z.string().optional(),
  EQ_DB_USER: z.string().optional(),
  EQ_DB_PASSWORD: z.string().optional(),
  EQ_REDIS_URL: z.string().optional()
});

export const env = envSchema.parse(process.env);

export function useMockData() {
  return env.EQ_USE_MOCK_DATA !== "false";
}

export function hasDatabaseConfig() {
  return Boolean(env.EQ_DB_HOST && env.EQ_DB_NAME && env.EQ_DB_USER);
}
