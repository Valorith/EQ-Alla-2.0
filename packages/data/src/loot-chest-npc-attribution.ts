import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const lootChestNpcAttributionSchema = z.array(
  z.object({
    chestNpcId: z.coerce.number().int().positive(),
    sourceNpcId: z.coerce.number().int().positive(),
    zoneShortName: z.string().trim().min(1).optional(),
    note: z.string().trim().min(1).optional()
  })
);

type LootChestNpcAttribution = {
  chestNpcId: number;
  sourceNpcId: number;
  zoneShortName?: string;
  note?: string;
};

let lootChestNpcAttributionCache:
  | {
      filePath: string;
      mtimeMs: number;
      entries: LootChestNpcAttribution[];
    }
  | undefined;

function resolveLootChestNpcAttributionPath() {
  const configuredPath = process.env.EQ_LOOT_CHEST_NPC_ATTRIBUTION_PATH?.trim();
  if (configuredPath) {
    return path.isAbsolute(configuredPath) ? configuredPath : path.resolve(process.cwd(), configuredPath);
  }

  let current = process.cwd();

  while (true) {
    const candidate = path.join(current, "data", "loot-chest-npc-attribution.json");
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return candidate;
    }

    current = parent;
  }
}

function loadLootChestNpcAttribution() {
  const filePath = resolveLootChestNpcAttributionPath();

  if (!fs.existsSync(filePath)) {
    lootChestNpcAttributionCache = {
      filePath,
      mtimeMs: -1,
      entries: []
    };
    return [];
  }

  const stats = fs.statSync(filePath);
  if (
    lootChestNpcAttributionCache &&
    lootChestNpcAttributionCache.filePath === filePath &&
    lootChestNpcAttributionCache.mtimeMs === stats.mtimeMs
  ) {
    return lootChestNpcAttributionCache.entries;
  }

  const parsed = lootChestNpcAttributionSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf8")));
  const deduped = new Map<string, LootChestNpcAttribution>();

  for (const entry of parsed) {
    deduped.set(`${entry.chestNpcId}:${entry.sourceNpcId}`, {
      chestNpcId: entry.chestNpcId,
      sourceNpcId: entry.sourceNpcId,
      zoneShortName: entry.zoneShortName?.trim().toLowerCase(),
      note: entry.note?.trim()
    });
  }

  const entries = [...deduped.values()];
  lootChestNpcAttributionCache = {
    filePath,
    mtimeMs: stats.mtimeMs,
    entries
  };

  return entries;
}

export function getLootChestSourceNpcIdsByChestNpcId(chestNpcIds: number[]) {
  const normalizedChestNpcIds = [...new Set(chestNpcIds.map((value) => Number(value)).filter((value) => value > 0))];
  const attributionByChestNpcId = new Map<number, number[]>();

  if (normalizedChestNpcIds.length === 0) {
    return attributionByChestNpcId;
  }

  for (const entry of loadLootChestNpcAttribution()) {
    if (normalizedChestNpcIds.includes(entry.chestNpcId)) {
      if (!attributionByChestNpcId.has(entry.chestNpcId)) {
        attributionByChestNpcId.set(entry.chestNpcId, []);
      }

      const sourceNpcIds = attributionByChestNpcId.get(entry.chestNpcId);
      if (!sourceNpcIds?.includes(entry.sourceNpcId)) {
        sourceNpcIds?.push(entry.sourceNpcId);
      }
    }
  }

  return attributionByChestNpcId;
}

export function getLootChestNpcIdsForSourceNpcId(sourceNpcId: number) {
  const normalizedSourceNpcId = Number(sourceNpcId);
  if (normalizedSourceNpcId <= 0) {
    return [];
  }

  return loadLootChestNpcAttribution()
    .filter((entry) => entry.sourceNpcId === normalizedSourceNpcId)
    .map((entry) => entry.chestNpcId);
}

export function getLootChestNpcIdsForSourceNpcIds(sourceNpcIds: number[]) {
  const normalizedSourceNpcIds = new Set(sourceNpcIds.map((value) => Number(value)).filter((value) => value > 0));
  if (normalizedSourceNpcIds.size === 0) {
    return [];
  }

  return loadLootChestNpcAttribution()
    .filter((entry) => normalizedSourceNpcIds.has(entry.sourceNpcId))
    .map((entry) => entry.chestNpcId);
}

export function getLootChestNpcIds() {
  return loadLootChestNpcAttribution().map((entry) => entry.chestNpcId);
}

export function getLootChestZoneShortNamesBySourceNpcId(sourceNpcIds: number[]) {
  const normalizedSourceNpcIds = new Set(sourceNpcIds.map((value) => Number(value)).filter((value) => value > 0));
  const zoneShortNamesBySourceNpcId = new Map<number, string[]>();

  if (normalizedSourceNpcIds.size === 0) {
    return zoneShortNamesBySourceNpcId;
  }

  for (const entry of loadLootChestNpcAttribution()) {
    if (!normalizedSourceNpcIds.has(entry.sourceNpcId) || !entry.zoneShortName) {
      continue;
    }

    if (!zoneShortNamesBySourceNpcId.has(entry.sourceNpcId)) {
      zoneShortNamesBySourceNpcId.set(entry.sourceNpcId, []);
    }

    const zoneShortNames = zoneShortNamesBySourceNpcId.get(entry.sourceNpcId);
    if (!zoneShortNames?.includes(entry.zoneShortName)) {
      zoneShortNames?.push(entry.zoneShortName);
    }
  }

  return zoneShortNamesBySourceNpcId;
}

export function getLootChestSourceNpcIdsForZoneShortName(zoneShortName: string) {
  const normalizedZoneShortName = zoneShortName.trim().toLowerCase();
  if (!normalizedZoneShortName) {
    return [];
  }

  return loadLootChestNpcAttribution()
    .filter((entry) => entry.zoneShortName === normalizedZoneShortName)
    .map((entry) => entry.sourceNpcId);
}
