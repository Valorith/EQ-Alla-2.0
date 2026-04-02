import fs from "node:fs";
import path from "node:path";
import { sql } from "kysely";
import { z } from "zod";
import { getDb } from "./db";

const publicZoneStatusCeiling = 1;

const manualNpcZoneOverrideSchema = z.array(
  z.object({
    npcId: z.coerce.number().int().positive(),
    zoneShortName: z.string().trim().min(1),
    note: z.string().trim().min(1).optional()
  })
);

type ManualNpcZoneOverride = {
  npcId: number;
  zoneShortName: string;
  note?: string;
};

type ManualNpcZoneLink = {
  shortName: string;
  longName: string;
  href: string;
};

let manualNpcZoneOverridesCache:
  | {
      filePath: string;
      mtimeMs: number;
      entries: ManualNpcZoneOverride[];
    }
  | undefined;

function resolveManualNpcZoneOverridesPath() {
  const configuredPath = process.env.EQ_MANUAL_NPC_ZONE_OVERRIDES_PATH?.trim();
  if (configuredPath) {
    return path.isAbsolute(configuredPath) ? configuredPath : path.resolve(process.cwd(), configuredPath);
  }

  let current = process.cwd();

  while (true) {
    const candidate = path.join(current, "data", "manual-npc-zone-overrides.json");
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

function loadManualNpcZoneOverrides() {
  const filePath = resolveManualNpcZoneOverridesPath();

  if (!fs.existsSync(filePath)) {
    manualNpcZoneOverridesCache = {
      filePath,
      mtimeMs: -1,
      entries: []
    };
    return [];
  }

  const stats = fs.statSync(filePath);
  if (
    manualNpcZoneOverridesCache &&
    manualNpcZoneOverridesCache.filePath === filePath &&
    manualNpcZoneOverridesCache.mtimeMs === stats.mtimeMs
  ) {
    return manualNpcZoneOverridesCache.entries;
  }

  const parsed = manualNpcZoneOverrideSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf8")));
  const deduped = new Map<string, ManualNpcZoneOverride>();

  for (const entry of parsed) {
    const normalizedEntry = {
      npcId: entry.npcId,
      zoneShortName: entry.zoneShortName.trim().toLowerCase(),
      note: entry.note?.trim()
    };

    deduped.set(`${normalizedEntry.npcId}:${normalizedEntry.zoneShortName}`, normalizedEntry);
  }

  const entries = [...deduped.values()];
  manualNpcZoneOverridesCache = {
    filePath,
    mtimeMs: stats.mtimeMs,
    entries
  };

  return entries;
}

async function resolveManualZoneLongNames(zoneShortNames: string[]) {
  const db = getDb();
  const normalizedShortNames = [...new Set(zoneShortNames.map((value) => value.trim().toLowerCase()).filter(Boolean))];

  if (!db || normalizedShortNames.length === 0) {
    return new Map<string, string>();
  }

  const rows = await sql<{ short_name: string; long_name: string }>`
    select short_name, long_name
    from zone
    where lower(short_name) in (${sql.join(normalizedShortNames.map((value) => sql`${value}`), sql`, `)})
      and coalesce(version, 0) = 0
      and coalesce(min_status, 0) <= ${publicZoneStatusCeiling}
    order by long_name asc
  `.execute(db);

  return new Map(rows.rows.map((row) => [row.short_name.trim().toLowerCase(), row.long_name]));
}

export async function getManualNpcZoneLinksByNpcId(npcIds: number[]) {
  const normalizedNpcIds = [...new Set(npcIds.map((value) => Number(value)).filter((value) => value > 0))];
  if (normalizedNpcIds.length === 0) {
    return new Map<number, ManualNpcZoneLink[]>();
  }

  const entries = loadManualNpcZoneOverrides().filter((entry) => normalizedNpcIds.includes(entry.npcId));
  if (entries.length === 0) {
    return new Map<number, ManualNpcZoneLink[]>();
  }

  const longNamesByShortName = await resolveManualZoneLongNames(entries.map((entry) => entry.zoneShortName));
  const linksByNpcId = new Map<number, ManualNpcZoneLink[]>();

  for (const entry of entries) {
    const link = {
      shortName: entry.zoneShortName,
      longName: longNamesByShortName.get(entry.zoneShortName) ?? entry.zoneShortName,
      href: `/zones/${entry.zoneShortName}`
    };

    if (!linksByNpcId.has(entry.npcId)) {
      linksByNpcId.set(entry.npcId, []);
    }

    const zoneLinks = linksByNpcId.get(entry.npcId);
    if (!zoneLinks?.some((existing) => existing.shortName === link.shortName)) {
      zoneLinks?.push(link);
    }
  }

  for (const zoneLinks of linksByNpcId.values()) {
    zoneLinks.sort((left, right) => left.longName.localeCompare(right.longName));
  }

  return linksByNpcId;
}

export function getManualNpcIdsForZone(shortName: string) {
  const normalizedShortName = shortName.trim().toLowerCase();
  if (!normalizedShortName) {
    return [];
  }

  return [
    ...new Set(
      loadManualNpcZoneOverrides()
        .filter((entry) => entry.zoneShortName === normalizedShortName)
        .map((entry) => entry.npcId)
    )
  ];
}
