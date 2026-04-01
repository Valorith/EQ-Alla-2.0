import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import sharp from "sharp";

const repoRoot = process.cwd();
const targetDir = path.join(repoRoot, "apps/web/public/assets/npc-models");
const assetBaseUrl = "https://cdn.jsdelivr.net/gh/EQEmuTools/eq-asset-preview@master/assets/npc_models";
const playableRaceIds = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 128, 130, 330, 522]);
const mockAppearances = [
  { raceId: 6, gender: 0, texture: 0, helmTexture: 0 },
  { raceId: 6, gender: 1, texture: 0, helmTexture: 0 },
  { raceId: 1, gender: 0, texture: 0, helmTexture: 0 }
];

function parseEnv(contents) {
  const values = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

async function loadEnv() {
  const env = { ...process.env };

  for (const filename of [".env.local", ".env", "env.local", "env"]) {
    const candidate = path.join(repoRoot, filename);
    try {
      const parsed = parseEnv(await fs.readFile(candidate, "utf8"));

      for (const [key, value] of Object.entries(parsed)) {
        if (env[key] === undefined) {
          env[key] = value;
        }
      }
    } catch {}
  }

  applyDatabaseFallbacks(env);
  return env;
}

function setEnvIfMissing(env, key, value) {
  if (!value || env[key] !== undefined) {
    return;
  }

  env[key] = value;
}

function applyDatabaseFallbacks(env) {
  setEnvIfMissing(env, "EQ_DB_HOST", env.MYSQLHOST);
  setEnvIfMissing(env, "EQ_DB_PORT", env.MYSQLPORT);
  setEnvIfMissing(env, "EQ_DB_NAME", env.MYSQLDATABASE);
  setEnvIfMissing(env, "EQ_DB_USER", env.MYSQLUSER);
  setEnvIfMissing(env, "EQ_DB_PASSWORD", env.MYSQLPASSWORD);

  const connectionUrl = env.DATABASE_URL ?? env.MYSQL_URL;
  if (!connectionUrl) {
    return;
  }

  let parsed;
  try {
    parsed = new URL(connectionUrl);
  } catch {
    return;
  }

  if (parsed.protocol !== "mysql:" && parsed.protocol !== "mysql2:") {
    return;
  }

  setEnvIfMissing(env, "EQ_DB_HOST", parsed.hostname || undefined);
  setEnvIfMissing(env, "EQ_DB_PORT", parsed.port || undefined);
  setEnvIfMissing(env, "EQ_DB_NAME", parsed.pathname.replace(/^\//, "") || undefined);
  setEnvIfMissing(env, "EQ_DB_USER", parsed.username ? decodeURIComponent(parsed.username) : undefined);
  setEnvIfMissing(env, "EQ_DB_PASSWORD", parsed.password ? decodeURIComponent(parsed.password) : undefined);
}

function normalizeAppearance(appearance) {
  let texture = Number(appearance.texture ?? 0);
  let helmTexture = Number(appearance.helmTexture ?? 0);
  const raceId = Number(appearance.raceId ?? 0);
  const gender = Number(appearance.gender ?? 0);

  if (playableRaceIds.has(raceId)) {
    if (helmTexture > 3) helmTexture = 0;
    if (texture > 16 || (texture > 3 && texture < 10)) texture = 0;
  }

  return { raceId, gender, texture, helmTexture };
}

function buildModelFilename(appearance) {
  const normalized = normalizeAppearance(appearance);
  return `CTN_${normalized.raceId}_${normalized.gender}_${normalized.texture}_${normalized.helmTexture}.png`;
}

async function getDatabaseAppearances(env) {
  if (!env.EQ_DB_HOST || !env.EQ_DB_NAME || !env.EQ_DB_USER) {
    return [];
  }

  const connection = await mysql.createConnection({
    host: env.EQ_DB_HOST,
    port: Number(env.EQ_DB_PORT || 3306),
    database: env.EQ_DB_NAME,
    user: env.EQ_DB_USER,
    password: env.EQ_DB_PASSWORD || ""
  });

  try {
    const [rows] = await connection.query(`
      select distinct
        race as raceId,
        ifnull(gender, 0) as gender,
        ifnull(texture, 0) as texture,
        ifnull(helmtexture, 0) as helmTexture
      from npc_types
      where race is not null
    `);

    return rows;
  } finally {
    await connection.end();
  }
}

async function ensureDirectory() {
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(
    path.join(targetDir, ".gitignore"),
    ["*", "!.gitignore"].join("\n") + "\n",
    "utf8"
  );
}

async function fetchAsset(filename) {
  try {
    const response = await fetch(`${assetBaseUrl}/${filename}`);
    if (!response.ok) {
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(path.join(targetDir, filename), buffer);
    return true;
  } catch {
    return false;
  }
}

async function upscaleAsset(filename) {
  const filePath = path.join(targetDir, filename);
  const metadata = await sharp(filePath).metadata();
  const width = Number(metadata.width ?? 0);
  const height = Number(metadata.height ?? 0);

  if (width <= 0 || height <= 0) {
    return false;
  }

  if (width >= 400 || height >= 400) {
    return false;
  }

  const targetHeight = Math.min(Math.max(height * 4, 400), 600);

  const buffer = await sharp(filePath)
    .resize({
      height: targetHeight,
      fit: "inside",
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  await fs.writeFile(filePath, buffer);
  return true;
}

async function mapWithConcurrency(items, limit, worker) {
  let index = 0;

  async function runWorker() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, () => runWorker()));
}

async function main() {
  await ensureDirectory();

  const env = await loadEnv();
  const databaseAppearances = await getDatabaseAppearances(env);
  const expectedFiles = new Set(
    [...databaseAppearances, ...mockAppearances]
      .map(buildModelFilename)
      .sort((left, right) => left.localeCompare(right))
  );

  const existingEntries = await fs.readdir(targetDir, { withFileTypes: true });
  const existingFiles = new Set(
    existingEntries.filter((entry) => entry.isFile() && entry.name.endsWith(".png")).map((entry) => entry.name)
  );

  let downloaded = 0;
  let skipped = 0;
  let missing = 0;
  let upscaled = 0;

  const expectedList = [...expectedFiles];

  await mapWithConcurrency(expectedList, 8, async (filename) => {
    if (existingFiles.has(filename)) {
      skipped += 1;
      if (await upscaleAsset(filename)) {
        upscaled += 1;
      }
      return;
    }

    const ok = await fetchAsset(filename);
    if (ok) {
      downloaded += 1;
      if (await upscaleAsset(filename)) {
        upscaled += 1;
      }
    } else {
      missing += 1;
    }
  });

  let removed = 0;
  for (const filename of existingFiles) {
    if (expectedFiles.has(filename)) continue;
    await fs.unlink(path.join(targetDir, filename));
    removed += 1;
  }

  console.log(
    JSON.stringify({
      targetDir,
        expected: expectedFiles.size,
        downloaded,
        skipped,
        upscaled,
        removed,
        missing
      })
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
