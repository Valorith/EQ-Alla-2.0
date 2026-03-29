import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import sharp from "sharp";
import { pipeline } from "@huggingface/transformers";

const repoRoot = process.cwd();
const sourceDir = path.join(repoRoot, "apps/web/public/assets/npc-models");
const targetDir = path.join(repoRoot, "apps/web/public/assets/npc-models-ai");
const modelId = "Xenova/swin2SR-classical-sr-x2-64";
const playableRaceIds = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 128, 130, 330, 522]);

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
  const env = {};

  for (const filename of [".env.local", ".env", "env.local", "env"]) {
    const candidate = path.join(repoRoot, filename);
    try {
      Object.assign(env, parseEnv(await fs.readFile(candidate, "utf8")));
    } catch {}
  }

  return env;
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

function parseArgs(argv) {
  const filenames = new Set();
  const npcIds = [];
  let all = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--all") {
      all = true;
      continue;
    }

    if (arg === "--filename") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --filename");
      }
      filenames.add(value);
      index += 1;
      continue;
    }

    if (arg === "--npc-id") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --npc-id");
      }
      npcIds.push(Number(value));
      index += 1;
      continue;
    }
  }

  if (!all && filenames.size === 0 && npcIds.length === 0) {
    throw new Error("Specify --all, --filename <name>, or --npc-id <id>.");
  }

  return { all, filenames, npcIds };
}

async function getNpcFilenames(env, npcIds) {
  if (npcIds.length === 0) {
    return [];
  }

  if (!env.EQ_DB_HOST || !env.EQ_DB_NAME || !env.EQ_DB_USER) {
    throw new Error("Database credentials are required for --npc-id.");
  }

  const connection = await mysql.createConnection({
    host: env.EQ_DB_HOST,
    port: Number(env.EQ_DB_PORT || 3306),
    database: env.EQ_DB_NAME,
    user: env.EQ_DB_USER,
    password: env.EQ_DB_PASSWORD || ""
  });

  try {
    const placeholders = npcIds.map(() => "?").join(", ");
    const [rows] = await connection.query(
      `
        select id, race as raceId, ifnull(gender, 0) as gender, ifnull(texture, 0) as texture, ifnull(helmtexture, 0) as helmTexture
        from npc_types
        where id in (${placeholders})
      `,
      npcIds
    );

    return rows.map(buildModelFilename);
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

async function collectFilenames({ all, filenames, npcIds }, env) {
  if (all) {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".png")).map((entry) => entry.name);
  }

  const resolved = new Set(filenames);
  for (const filename of await getNpcFilenames(env, npcIds)) {
    resolved.add(filename);
  }

  return [...resolved];
}

async function upscaleOne(filename, upscaler) {
  const sourcePath = path.join(sourceDir, filename);
  const outputPath = path.join(targetDir, filename);
  const sourceBuffer = await fs.readFile(sourcePath);
  const sourceMeta = await sharp(sourceBuffer).ensureAlpha().metadata();
  const upscaled = await upscaler(sourcePath);

  let output = sharp(Buffer.from(upscaled.data), {
    raw: {
      width: upscaled.width,
      height: upscaled.height,
      channels: upscaled.channels
    }
  });

  if ((sourceMeta.hasAlpha ?? false) && upscaled.channels === 3) {
    const alpha = await sharp(sourceBuffer)
      .ensureAlpha()
      .extractChannel("alpha")
      .resize({
        width: upscaled.width,
        height: upscaled.height,
        fit: "fill",
        kernel: sharp.kernel.lanczos3
      })
      .raw()
      .toBuffer();

    output = output.joinChannel(alpha, {
      raw: {
        width: upscaled.width,
        height: upscaled.height,
        channels: 1
      }
    });
  }

  await output.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(outputPath);
}

async function main() {
  await ensureDirectory();

  const args = parseArgs(process.argv.slice(2));
  const env = await loadEnv();
  const filenames = await collectFilenames(args, env);

  if (filenames.length === 0) {
    throw new Error("No NPC model filenames were resolved.");
  }

  process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= "0";
  const upscaler = await pipeline("image-to-image", modelId);

  let completed = 0;
  for (const filename of filenames) {
    await upscaleOne(filename, upscaler);
    completed += 1;
  }

  console.log(
    JSON.stringify({
      modelId,
      sourceDir,
      targetDir,
      processed: completed,
      filenames
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
