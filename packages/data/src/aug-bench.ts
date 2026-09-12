import { z } from "zod";
import { itemSlotFlags } from "./item-search-filters";

export const equipmentSlots = itemSlotFlags.map(([mask, label], index) => ({
  id: index,
  mask,
  label: [1, 9, 15].includes(index) ? `Left ${label.toLowerCase()}` : [4, 10, 16].includes(index) ? `Right ${label.toLowerCase()}` : label
}));

export const augmentStats = [
  { key: "ac", label: "AC", category: "Defense" },
  { key: "hp", label: "HP", category: "Defense" },
  { key: "mana", label: "Mana", category: "Casting" },
  { key: "endur", label: "Endurance", category: "Offense" },
  { key: "attack", label: "Attack", category: "Offense" },
  { key: "damage", label: "Damage", category: "Offense" },
  { key: "elemdmgamt", label: "Elemental damage", category: "Offense" },
  { key: "backstabdmg", label: "Backstab damage", category: "Offense" },
  { key: "banedmgamt", label: "Bane body damage", category: "Offense" },
  { key: "banedmgraceamt", label: "Bane race damage", category: "Offense" },
  { key: "skillmodvalue", label: "Skill modifier", category: "Skills" },
  { key: "extradmgamt", label: "Skill damage", category: "Skills" },
  { key: "bardvalue", label: "Instrument modifier", category: "Instruments" },
  { key: "spelldmg", label: "Spell damage", category: "Casting" },
  { key: "healamt", label: "Healing", category: "Casting" },
  { key: "accuracy", label: "Accuracy", category: "Offense" },
  { key: "combateffects", label: "Combat effects", category: "Offense" },
  { key: "shielding", label: "Shielding", category: "Defense" },
  { key: "avoidance", label: "Avoidance", category: "Defense" },
  { key: "spellshield", label: "Spell shielding", category: "Defense" },
  { key: "dotshielding", label: "DoT shielding", category: "Defense" },
  { key: "stunresist", label: "Stun resist", category: "Defense" },
  { key: "strikethrough", label: "Strikethrough", category: "Offense" },
  { key: "damageshield", label: "Damage shield", category: "Defense" },
  { key: "dsmitigation", label: "Damage shield mitigation", category: "Defense" },
  { key: "clairvoyance", label: "Clairvoyance", category: "Casting" },
  { key: "haste", label: "Haste", category: "Offense" },
  { key: "regen", label: "HP regen", category: "Recovery" },
  { key: "manaregen", label: "Mana regen", category: "Recovery" },
  { key: "enduranceregen", label: "Endurance regen", category: "Recovery" },
  ...["str", "sta", "agi", "dex", "int", "wis", "cha"].flatMap((stat) => [
    { key: `a${stat}`, label: stat.toUpperCase(), category: "Attributes" },
    { key: `heroic_${stat}`, label: `Heroic ${stat.toUpperCase()}`, category: "Heroics" }
  ]),
  ...["mr", "fr", "cr", "dr", "pr"].map((stat) => ({ key: stat, label: stat.toUpperCase(), category: "Resists" })),
  { key: "svcorruption", label: "Corruption", category: "Resists" }
];

// These values depend on an element, skill, instrument, or target. Never sum
// different kinds together or imply that percentage modifiers stack.
export const conditionalStatKeys = new Set(["elemdmgamt", "banedmgamt", "banedmgraceamt", "skillmodvalue", "extradmgamt", "bardvalue"]);

export const benchItemSchema = z.object({
  id: z.number().int().positive(), name: z.string(), icon: z.string(),
  slots: z.number().int(), classes: z.number().int(), races: z.number().int(),
  itemType: z.number().int(), augType: z.number().int(), restriction: z.number().int(),
  loreGroup: z.number().int(), requiredLevel: z.number(), recommendedLevel: z.number(),
  tradeable: z.boolean(), source: z.string(),
  stats: z.record(z.string(), z.number()),
  bonuses: z.array(z.object({ label: z.string(), value: z.number(), unit: z.string() })).default([]),
  effects: z.array(z.object({ kind: z.string(), id: z.number().int().positive(), name: z.string() }))
});
export type BenchItem = z.infer<typeof benchItemSchema>;
export const benchCatalogSchema = z.object({
  data: z.array(benchItemSchema), retrievedAt: z.string()
});

const itemId = z.number().int().positive();
const quantities = z.record(z.string().regex(/^\d+$/), z.number().int().min(0).max(999));
export const benchCharacterSchema = z.object({
  id: z.number().int().positive(), name: z.string().max(64), level: z.number().int().min(1).max(255),
  classId: z.number().int().min(1).max(16), raceId: z.number().int().positive()
});
export const benchCharacterSearchSchema = z.object({ data: z.array(benchCharacterSchema) });
export const benchEquipmentSchema = z.object({
  slotId: z.number().int().min(0).max(22), id: z.number().int().positive(), name: z.string(), icon: z.string(),
  itemType: z.number().int(), sockets: z.array(z.object({
    index: z.number().int().min(1).max(6), type: z.number().int().min(1).max(32), visible: z.boolean(),
    installedAugmentId: z.number().int().positive().nullable(), unavailable: z.boolean()
  })).max(6).refine((sockets) => new Set(sockets.map((socket) => socket.index)).size === sockets.length, "Socket indices must be unique.")
});
export const benchCharacterProfileSchema = z.object({
  character: benchCharacterSchema, equipment: z.array(benchEquipmentSchema).max(23).refine((equipment) => new Set(equipment.map((gear) => gear.slotId)).size === equipment.length, "Equipment positions must be unique."), retrievedAt: z.string(),
  unavailableEquipment: z.number().int().nonnegative().default(0)
});
export type BenchCharacterProfile = z.infer<typeof benchCharacterProfileSchema>;
export type BenchCharacter = z.infer<typeof benchCharacterSchema>;
const planFields = {
  name: z.string().max(80),
  classBit: z.number().int().min(0).max(65535), raceBit: z.number().int().min(0).max(65535),
  level: z.number().int().min(1).max(255),
  owned: quantities, wanted: quantities
};
const positionPlanSchema = z.object({
  ...planFields, version: z.literal(2),
  character: benchCharacterProfileSchema.optional(),
  // A generated fresh loadout replaces all occupants, including undiscovered ones.
  ignoreEquippedAugments: z.boolean().optional(),
  optimization: z.object({
    archetype: z.enum(["tank", "melee", "caster", "healer"]),
    weights: z.record(z.string(), z.number().min(0).max(1000))
  }).optional(),
  // The suffix identifies a planned augment, not an equipment socket.
  augments: z.record(z.string().regex(/^(?:[0-9]|1[0-9]|2[0-2]):[1-9]\d*$/), itemId)
});
const legacyPlanSchema = z.object({
  ...planFields, version: z.literal(1),
  augments: z.record(z.string().regex(/^(?:[0-9]|1[0-9]|2[0-2]):[1-6]$/), itemId)
});
export const benchPlanSchema = z.union([positionPlanSchema, legacyPlanSchema.transform((plan) => positionPlanSchema.parse({ ...plan, version: 2 }))]);
export type BenchPlan = z.infer<typeof benchPlanSchema>;
export function emptyBenchPlan(): BenchPlan {
  return { version: 2, name: "My augment build", classBit: 0, raceBit: 0, level: 65, augments: {}, owned: {}, wanted: {} };
}

// EQEmu common/item_data.h: standard and special ornamentation are cosmetic.
export function isOrnamentationType(type: number) {
  return type === 20 || type === 21;
}

export function planningAugmentTypes(mask: number) {
  return augmentTypes(mask).filter((type) => !isOrnamentationType(type));
}

export function isPlanningAugment(item: BenchItem) {
  return planningAugmentTypes(item.augType).length > 0;
}

export function withoutOrnamentation(plan: BenchPlan, catalog: readonly BenchItem[] = []): BenchPlan {
  const cosmeticIds = new Set(catalog.filter((item) => !isPlanningAugment(item)).map((item) => item.id));
  const cosmeticKeys = new Set<string>();
  const equipment = plan.character?.equipment.map((gear) => {
    const sockets = gear.sockets.filter((socket) => {
      if (!isOrnamentationType(socket.type)) return true;
      cosmeticKeys.add(`${gear.slotId}:${socket.index}`);
      return false;
    });
    return sockets.length === gear.sockets.length ? gear : { ...gear, sockets };
  });
  const augments = Object.fromEntries(Object.entries(plan.augments).filter(([key, id]) => !cosmeticKeys.has(key) && !cosmeticIds.has(id)));
  const owned = Object.fromEntries(Object.entries(plan.owned).filter(([id]) => !cosmeticIds.has(Number(id))));
  const wanted = Object.fromEntries(Object.entries(plan.wanted).filter(([id]) => !cosmeticIds.has(Number(id))));
  if (!cosmeticKeys.size && Object.keys(augments).length === Object.keys(plan.augments).length
    && Object.keys(owned).length === Object.keys(plan.owned).length && Object.keys(wanted).length === Object.keys(plan.wanted).length) return plan;
  return { ...plan, augments, owned, wanted,
    ...(cosmeticKeys.size && plan.character && equipment ? { character: { ...plan.character, equipment } } : {}) };
}

export function planFromCharacter(profile: BenchCharacterProfile): BenchPlan {
  const raceIndex = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 128, 130, 330, 522].indexOf(profile.character.raceId);
  const plan: BenchPlan = { ...emptyBenchPlan(), character: profile, name: `${profile.character.name}'s augments`,
    classBit: 2 ** (profile.character.classId - 1), raceBit: raceIndex < 0 ? 0 : 2 ** raceIndex, level: profile.character.level };
  for (const gear of profile.equipment) for (const socket of gear.sockets) {
    if (isOrnamentationType(socket.type) || !socket.installedAugmentId) continue;
    plan.augments[`${gear.slotId}:${socket.index}`] = socket.installedAugmentId;
    plan.owned[socket.installedAugmentId] = (plan.owned[socket.installedAugmentId] ?? 0) + 1;
  }
  return withoutOrnamentation(plan);
}

// Matches Client::IsAugmentRestricted in the server's zone/inventory.cpp.
export function fitsEquipmentRestriction(augment: BenchItem, itemType: number) {
  const allowed: Record<number, number[]> = {
    1: [10], 2: [0, 1, 2, 3, 4, 5, 35, 45], 3: [0, 2, 3, 45], 4: [1, 4, 5, 35],
    5: [0], 6: [3], 7: [2], 8: [45], 9: [1], 10: [4], 11: [35], 12: [5], 13: [8], 14: [0, 3, 45], 15: [3, 45]
  };
  return augment.restriction === 0 || Boolean(allowed[augment.restriction]?.includes(itemType));
}

export function matchingSockets(augment: BenchItem, slotId: number, plan: BenchPlan, socketIndex?: number) {
  const gear = plan.character?.equipment.find((item) => item.slotId === slotId);
  if (!gear || !fitsPosition(augment, slotId) || !fitsEquipmentRestriction(augment, gear.itemType)) return [];
  return gear.sockets.filter((socket) => !isOrnamentationType(socket.type) && socket.visible && (!socket.unavailable || plan.ignoreEquippedAugments)
    && (!socketIndex || socket.index === socketIndex) && augmentTypes(augment.augType).includes(socket.type));
}

export function placementSocket(augment: BenchItem, slotId: number, plan: BenchPlan, replacingKey?: string, socketIndex?: number, movingFrom?: string) {
  const index = replacingKey ? Number(replacingKey.split(":")[1]) : socketIndex;
  return matchingSockets(augment, slotId, plan, index).find((socket) => {
    const key = `${slotId}:${socket.index}`;
    return !plan.augments[key] || key === replacingKey || key === movingFrom;
  });
}

export function augmentTypes(mask: number) {
  return Array.from({ length: 32 }, (_, i) => i + 1).filter((type) => ((mask >>> (type - 1)) & 1) !== 0);
}
export function wearableBy(item: BenchItem, plan: Pick<BenchPlan, "classBit" | "raceBit" | "level">) {
  return (!plan.classBit || (item.classes & plan.classBit) !== 0)
    && (!plan.raceBit || (item.races & plan.raceBit) !== 0)
    && item.requiredLevel <= plan.level;
}
export const restrictionLabels = [
  "Any equipment", "Armor", "Weapons", "1H weapons", "2H weapons / bows", "1H slashing", "1H blunt",
  "Piercing", "Hand to hand", "2H slashing", "2H blunt", "2H piercing", "Bows", "Shields",
  "1H slashing / blunt / hand to hand", "1H blunt / hand to hand"
];
export function loreConflict(left: BenchItem, right: BenchItem) {
  return left.loreGroup === -1 ? left.id === right.id : left.loreGroup > 0 && left.loreGroup === right.loreGroup;
}
export function fitsPosition(item: BenchItem, slotId: number) {
  const slot = equipmentSlots.find((entry) => entry.id === slotId);
  return isPlanningAugment(item) && Boolean(slot && (item.slots & slot.mask) !== 0);
}

export function nextPlanKey(plan: BenchPlan, slotId: number) {
  let index = 1;
  while (plan.augments[`${slotId}:${index}`] !== undefined) index++;
  return `${slotId}:${index}`;
}

export function placementProblem({ augment, slotId, replacingKey, socketIndex, plan, items, movingFrom }: {
  augment: BenchItem; slotId: number; replacingKey?: string; socketIndex?: number;
  plan: BenchPlan; items: ReadonlyMap<number, BenchItem>; movingFrom?: string;
}): string | null {
  if (!fitsPosition(augment, slotId)) return "Augment is not allowed in this position.";
  if (!wearableBy(augment, plan)) return "Class, race, or required level does not match your build.";
  if (plan.character && !placementSocket(augment, slotId, plan, replacingKey, socketIndex, movingFrom)) {
    return "No compatible empty socket on this equipment. Select an occupied socket to replace its augment.";
  }
  let sharedClasses = augment.classes;
  let sharedRaces = augment.races;
  for (const [key, id] of Object.entries(plan.augments)) {
    if (key === replacingKey || key === movingFrom) continue;
    const other = items.get(id);
    if (other) { sharedClasses &= other.classes; sharedRaces &= other.races; }
    if (other && loreConflict(augment, other)) return `Lore conflict with ${other.name}.`;
  }
  if (!sharedClasses || !sharedRaces) return "No shared class or race can wear all the items in this build.";
  return null;
}

export function acquisitionList(plan: BenchPlan, items: ReadonlyMap<number, BenchItem>) {
  const planned = new Map<number, number>();
  for (const id of Object.values(plan.augments)) planned.set(id, (planned.get(id) ?? 0) + 1);
  return [...new Set([...planned.keys(), ...Object.keys(plan.wanted).map(Number)])].flatMap((id) => {
    const item = items.get(id);
    if (!item || !isPlanningAugment(item)) return [];
    const quantity = Math.max(planned.get(id) ?? 0, plan.wanted[id] ?? 0);
    if (!quantity) return [];
    const owned = plan.owned[id] ?? 0;
    return [{ item, quantity, owned, missing: Math.max(0, quantity - owned) }];
  });
}

export function augmentMoveTargets(plan: BenchPlan, items: ReadonlyMap<number, BenchItem>, sourceKey: string) {
  const augment = items.get(plan.augments[sourceKey]);
  if (!augment) return [];
  return (plan.character?.equipment ?? []).flatMap((gear) => gear.sockets.flatMap((socket) => {
    const key = `${gear.slotId}:${socket.index}`;
    if (key === sourceKey || placementProblem({ augment, slotId: gear.slotId, socketIndex: socket.index, plan, items, movingFrom: sourceKey })) return [];
    return [{ key, slotId: gear.slotId, socketIndex: socket.index, label: `${equipmentSlots[gear.slotId].label} · Socket ${socket.index} · Type ${socket.type}` }];
  }));
}

export function augmentTotals(augments: BenchItem[]) {
  return Object.fromEntries(augmentStats.map(({ key }) => [key,
    conditionalStatKeys.has(key) ? 0 : key === "haste" ? Math.max(0, ...augments.map((item) => item.stats[key] ?? 0))
      : augments.reduce((sum, item) => sum + (item.stats[key] ?? 0), 0)
  ]));
}
