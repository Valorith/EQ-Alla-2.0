import type { ZoneSummary } from "./types";

export type ZoneEraDefinition = {
  slug: string;
  label: string;
  aliases?: string[];
};

export type ZoneEraBrowseDefinition = ZoneEraDefinition & {
  enabled: boolean;
  zoneCount: number;
};

export const expansionNames: Record<number, string> = {
  0: "Classic",
  1: "Ruins of Kunark",
  2: "Scars of Velious",
  3: "Shadows of Luclin",
  4: "Planes of Power",
  5: "Legacy of Ykesha",
  6: "Lost Dungeons of Norrath",
  7: "Gates of Discord",
  8: "Omens of War",
  9: "Dragons of Norrath",
  10: "Depths of Darkhollow",
  11: "Prophecy of Ro",
  12: "The Serpent's Spine",
  13: "The Buried Sea",
  14: "Secrets of Faydwer",
  15: "Seeds of Destruction",
  16: "Underfoot",
  17: "House of Thule",
  18: "Veil of Alaris"
};

export const zoneEraDefinitions: ZoneEraDefinition[] = [
  {
    slug: "classic",
    label: expansionNames[0],
    aliases: ["antonica", "odus", "faydwer", "old world planes", "old planes"]
  },
  { slug: "kunark", label: expansionNames[1], aliases: ["kunark"] },
  { slug: "velious", label: expansionNames[2], aliases: ["velious"] },
  { slug: "luclin", label: expansionNames[3], aliases: ["luclin"] },
  { slug: "power", label: expansionNames[4], aliases: ["power", "the planes of power"] },
  { slug: "ykesha", label: expansionNames[5], aliases: ["ykesha", "the legacy of ykesha"] },
  { slug: "ldon", label: expansionNames[6], aliases: ["ldon", "the lost dungeons of norrath"] },
  { slug: "god", label: expansionNames[7], aliases: ["god", "the gates of discord"] },
  { slug: "omens", label: expansionNames[8], aliases: ["omens", "the omens of war"] },
  { slug: "don", label: expansionNames[9], aliases: ["don"] },
  { slug: "dod", label: expansionNames[10], aliases: ["dod"] },
  { slug: "por", label: expansionNames[11], aliases: ["por"] },
  { slug: "tss", label: expansionNames[12], aliases: ["tss", "serpent's spine", "the serpents spine"] },
  { slug: "tbs", label: expansionNames[13], aliases: ["tbs", "buried sea"] },
  { slug: "sof", label: expansionNames[14], aliases: ["sof"] },
  { slug: "sod", label: expansionNames[15], aliases: ["sod"] },
  { slug: "uf", label: expansionNames[16], aliases: ["uf"] },
  { slug: "hot", label: expansionNames[17], aliases: ["hot"] },
  { slug: "voa", label: expansionNames[18], aliases: ["voa"] }
];

function normalizeZoneEraValue(value: string) {
  return value.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

function buildZoneEraCandidates(definition: ZoneEraDefinition) {
  return new Set(
    [definition.slug, definition.label, ...(definition.aliases ?? [])]
      .filter(Boolean)
      .map(normalizeZoneEraValue)
  );
}

export function formatExpansion(expansion: number | null | undefined) {
  return expansionNames[expansion ?? 0] ?? `Expansion ${expansion ?? 0}`;
}

export function listZoneEraDefinitions() {
  return zoneEraDefinitions.map((definition) => ({ ...definition }));
}

export function getZoneEraLabels() {
  return zoneEraDefinitions.map((definition) => definition.label);
}

export function resolveZoneEra(input: string | null | undefined) {
  if (!input?.trim()) return undefined;
  const normalizedInput = normalizeZoneEraValue(input);
  return zoneEraDefinitions.find((definition) => buildZoneEraCandidates(definition).has(normalizedInput));
}

export function resolveZoneEraLabel(input: string | null | undefined) {
  return resolveZoneEra(input)?.label ?? (input?.trim() || "");
}

export function formatZoneEra(_shortName: string | null | undefined, expansion: number | null | undefined) {
  return formatExpansion(expansion);
}

export function matchesZoneEraFilter(zone: Pick<ZoneSummary, "shortName" | "era">, filter: string | null | undefined) {
  if (!filter?.trim()) return true;

  const definition = resolveZoneEra(filter);
  const normalizedZoneEra = normalizeZoneEraValue(resolveZoneEraLabel(zone.era) || zone.era);

  if (!definition) {
    return normalizedZoneEra.includes(normalizeZoneEraValue(filter));
  }

  return buildZoneEraCandidates(definition).has(normalizedZoneEra);
}
