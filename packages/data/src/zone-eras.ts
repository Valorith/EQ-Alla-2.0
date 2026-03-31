import type { ZoneSummary } from "./types";

export type ZoneEraDefinition = {
  slug: string;
  label: string;
  aliases?: string[];
  matchEraNames?: string[];
  shortNames?: string[];
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

const classicAntonicaShortNames = [
  "arena",
  "befallen",
  "beholder",
  "blackburrow",
  "cazicthule",
  "commons",
  "eastkarana",
  "ecommons",
  "erudsxing",
  "everfrost",
  "feerrott",
  "freporte",
  "freportn",
  "freportw",
  "grobb",
  "gukbottom",
  "gukta",
  "guktop",
  "halas",
  "halls",
  "highkeep",
  "highpass",
  "highpasshold",
  "innothule",
  "jaggedpine",
  "kithicor",
  "lakerathe",
  "lavastorm",
  "misty",
  "najena",
  "nedaria",
  "nektulos",
  "neriaka",
  "neriakb",
  "neriakc",
  "neriakd",
  "northkarana",
  "nro",
  "oasis",
  "oggok",
  "oot",
  "qey2hh1",
  "paw",
  "permafrost",
  "qcat",
  "qeynos",
  "qeynos2",
  "qeytoqrg",
  "qrg",
  "rathemtn",
  "rivervale",
  "runnyeye",
  "soldunga",
  "soldungb",
  "solrotower",
  "southkarana",
  "sro",
  "westkarana"
] as const;

const classicOdusShortNames = [
  "erudnext",
  "erudnint",
  "erudsxing",
  "hole",
  "kerraridge",
  "paineel",
  "stonebrunt",
  "tox",
  "warrens"
] as const;

const classicFaydwerShortNames = [
  "akanon",
  "butcher",
  "cauldron",
  "crushbone",
  "felwithea",
  "felwitheb",
  "gfaydark",
  "kaladima",
  "kaladimb",
  "kedge",
  "lfaydark",
  "mistmoore",
  "steamfont",
  "unrest"
] as const;

const classicPlanesShortNames = ["airplane", "fearplane", "hateplane", "hateplaneb"] as const;
const kunarkOverrideShortNames = ["chardok", "veksar"] as const;

export const zoneEraDefinitions: ZoneEraDefinition[] = [
  { slug: "antonica", label: "Antonica", shortNames: [...classicAntonicaShortNames] },
  { slug: "odus", label: "Odus", shortNames: [...classicOdusShortNames] },
  { slug: "faydwer", label: "Faydwer", shortNames: [...classicFaydwerShortNames] },
  { slug: "planes", label: "Old World Planes", aliases: ["old planes"], shortNames: [...classicPlanesShortNames] },
  { slug: "kunark", label: "Ruins of Kunark", aliases: ["kunark"], matchEraNames: [expansionNames[1]], shortNames: [...kunarkOverrideShortNames] },
  { slug: "velious", label: "Scars of Velious", aliases: ["velious"], matchEraNames: [expansionNames[2]] },
  { slug: "luclin", label: "Shadows of Luclin", aliases: ["luclin"], matchEraNames: [expansionNames[3]] },
  { slug: "power", label: "The Planes of Power", aliases: ["power", "planes of power"], matchEraNames: [expansionNames[4]] },
  { slug: "ykesha", label: "The Legacy of Ykesha", aliases: ["legacy of ykesha", "ykesha"], matchEraNames: [expansionNames[5]] },
  {
    slug: "ldon",
    label: "The Lost Dungeons of Norrath",
    aliases: ["lost dungeons of norrath", "ldon"],
    matchEraNames: [expansionNames[6]]
  },
  { slug: "god", label: "The Gates of Discord", aliases: ["gates of discord", "god"], matchEraNames: [expansionNames[7]] },
  { slug: "omens", label: "The Omens of War", aliases: ["omens of war", "omens"], matchEraNames: [expansionNames[8]] },
  { slug: "don", label: "Dragons of Norrath", aliases: ["don"], matchEraNames: [expansionNames[9]] },
  { slug: "dod", label: "Depths of Darkhollow", aliases: ["dod"], matchEraNames: [expansionNames[10]] },
  { slug: "por", label: "Prophecy of Ro", aliases: ["por"], matchEraNames: [expansionNames[11]] },
  {
    slug: "tss",
    label: "The Serpent's Spine",
    aliases: ["serpent's spine", "the serpents spine", "tss"],
    matchEraNames: [expansionNames[12]]
  },
  { slug: "tbs", label: "The Buried Sea", aliases: ["buried sea", "tbs"], matchEraNames: [expansionNames[13]] },
  { slug: "sof", label: "Secrets of Faydwer", aliases: ["sof"], matchEraNames: [expansionNames[14]] },
  { slug: "sod", label: "Seeds of Destruction", aliases: ["sod"], matchEraNames: [expansionNames[15]] },
  { slug: "uf", label: "Underfoot", aliases: ["uf"], matchEraNames: [expansionNames[16]] },
  { slug: "hot", label: "House of Thule", aliases: ["hot"], matchEraNames: [expansionNames[17]] },
  { slug: "voa", label: "Veil of Alaris", aliases: ["voa"], matchEraNames: [expansionNames[18]] }
];

function normalizeZoneEraValue(value: string) {
  return value.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

function buildZoneEraCandidates(definition: ZoneEraDefinition) {
  return new Set(
    [definition.slug, definition.label, ...(definition.aliases ?? []), ...(definition.matchEraNames ?? [])]
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

export function resolveZoneEraByShortName(shortName: string | null | undefined) {
  const normalizedShortName = shortName?.trim().toLowerCase();
  if (!normalizedShortName) return undefined;
  return zoneEraDefinitions.find((definition) => definition.shortNames?.includes(normalizedShortName));
}

export function formatZoneEra(shortName: string | null | undefined, expansion: number | null | undefined) {
  return resolveZoneEraByShortName(shortName)?.label ?? formatExpansion(expansion);
}

export function matchesZoneEraFilter(zone: Pick<ZoneSummary, "shortName" | "era">, filter: string | null | undefined) {
  if (!filter?.trim()) return true;

  const definition = resolveZoneEra(filter);
  if (!definition) {
    return normalizeZoneEraValue(zone.era).includes(normalizeZoneEraValue(filter));
  }

  const zoneDefinition = resolveZoneEraByShortName(zone.shortName);
  const normalizedShortName = zone.shortName.toLowerCase();
  if (definition.shortNames?.includes(normalizedShortName)) {
    return true;
  }

  const zoneEra = normalizeZoneEraValue(zoneDefinition?.label ?? zone.era);
  return [...buildZoneEraCandidates(definition)].includes(zoneEra);
}
