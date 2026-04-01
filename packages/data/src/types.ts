export type SearchEntityType =
  | "item"
  | "spell"
  | "npc"
  | "zone"
  | "faction"
  | "recipe"
  | "pet"
  | "task"
  | "spawngroup";

export type SearchHit = {
  id: string;
  type: SearchEntityType;
  title: string;
  href: string;
  subtitle: string;
  tags: string[];
  icon?: string;
};

export type ItemSummary = {
  id: number;
  name: string;
  icon: string;
  type: string;
  slot: string;
  classes: string[];
  tradeable: boolean;
  levelRequired: number;
  zone: string;
  ac: number;
  hp: number;
  mana: number;
  damage: number;
  delay: number;
};

export type ItemDetail = ItemSummary & {
  icon: string;
  lore: string;
  flags: string[];
  classDisplay: string;
  raceDisplay: string;
  slotDisplay: string;
  size: string;
  weight: string;
  skill: string;
  itemTypeLabel: string;
  recommendedLevel: number;
  range: number;
  attack: number;
  haste: number;
  endurance: number;
  hpRegen: number;
  manaRegen: number;
  enduranceRegen: number;
  damageBonus: number;
  coinValue: { pp: number; gp: number; sp: number; cp: number };
  augmentSlots: Array<{ slot: number; type: number }>;
  droppedInZones: Array<{ shortName: string; longName: string; href: string }>;
  combatEffect?: { id: number; name: string; href: string; level?: number; chanceModifier?: number };
  wornEffect?: { id: number; name: string; href: string; level?: number };
  focusEffect?: { id: number; name: string; href: string; level?: number };
  clickEffect?: { id: number; name: string; href: string; level?: number; castType?: string };
  spellScrollEffect?: { id: number; name: string; href: string };
  stats: Array<{ label: string; value: string }>;
  droppedBy: Array<{
    id: number;
    name: string;
    href: string;
    dropChance: number;
    multiplier: number;
    zone: { shortName: string; longName: string; href: string };
  }>;
  soldBy: Array<{
    id: number;
    name: string;
    href: string;
    zone: { shortName: string; longName: string; href: string };
  }>;
  usedInRecipes: Array<{ id: number; name: string; href: string }>;
};

export type SpellSummary = {
  id: number;
  name: string;
  icon: string;
  classes: string[];
  className: string;
  classLevel: string;
  level: number;
  skill: string;
  effect: string;
  mana: number;
  target: string;
};

export type SpellDetail = SpellSummary & {
  description: string;
  classLevels: Array<{ className: string; level: number }>;
  messages: Array<{ label: string; text: string }>;
  castTime: string;
  recoveryTime: string;
  recastTime: string;
  range: string;
  duration: string;
  resist: string;
  resistAdjust: number;
  interruptible: boolean;
  hateGenerated: number;
  aoeRange: number;
  aoeMaxTargets: number;
  aoeDuration: string;
  reagents: Array<{ id: number; name: string; count: number; href: string }>;
  effects: Array<{ slot: number; text: string }>;
  itemSources: Array<{ id: number; name: string; href: string; icon: string }>;
};

export type NpcSummary = {
  id: number;
  name: string;
  race: string;
  klass: string;
  level: string;
  zone: string;
  named: boolean;
};

export type NpcDetail = NpcSummary & {
  fullName: string;
  appearance: {
    raceId: number;
    gender: number;
    texture: number;
    helmTexture: number;
  };
  hp: number;
  mana: number;
  damage: string;
  faction: string;
  mainFaction: { id: number; name: string; href: string } | null;
  attackDelay: number;
  specialAttacks: string[];
  spells: Array<{ id: number; name: string; href: string; type: string; icon: string }>;
  drops: Array<{
    lootdropId: number;
    probability: number;
    multiplier: number;
    items: Array<{ id: number; name: string; href: string; type: string; icon: string; chance: number; globalChance: number }>;
  }>;
  sells: Array<{ id: number; name: string; href: string; icon: string; price: string }>;
  spawnGroups: Array<{ id: number; name: string; href: string }>;
  spawnZones: Array<{ shortName: string; longName: string; href: string }>;
  factionHits: {
    lowers: Array<{ id: number; name: string; href: string; value: number }>;
    raises: Array<{ id: number; name: string; href: string; value: number }>;
  };
};

export type ZoneSummary = {
  id: number;
  shortName: string;
  longName: string;
  spawns: number;
  era: string;
  levelRange: string;
  population: string;
};

export type ZoneLevelBand = {
  label: string;
  minLevel: number;
  maxLevel: number;
  npcCount: number;
  isSignificant: boolean;
};

export type ZoneByLevelSummary = {
  id: number;
  shortName: string;
  longName: string;
  era: string;
  hotzone: boolean;
  suggestedLevel: string;
  bands: ZoneLevelBand[];
};

export type SpawnGroupDetail = {
  id: number;
  name: string;
  zone: { shortName: string; longName: string; href: string };
  respawn: string;
  locations: string[];
  entries: Array<{ id: number; name: string; chance: string; href: string }>;
};

export type ZoneResourceLink = {
  label: string;
  href: string;
  count: number;
  description?: string;
  mode?: "npcs" | "named" | "items" | "forage" | "tasks" | "spawngroups";
};

export type ZoneBestiaryEntry = {
  id: number;
  name: string;
  href: string;
  levelRange: string;
  race: string;
  klass: string;
  classification: string;
  named: boolean;
  variants: number;
};

export type ZoneItemDropEntry = {
  id: number;
  name: string;
  href: string;
  icon: string;
  type: string;
};

export type ZoneForageEntry = {
  id: number;
  name: string;
  href: string;
  icon: string;
  chance: number;
  skill: number;
};

export type ZoneDetail = ZoneSummary & {
  hotzone: boolean;
  safePoint: string;
  encounterRange: string;
  spawnPoints: number;
  rules: string[];
  resources: ZoneResourceLink[];
  bestiary: ZoneBestiaryEntry[];
  namedNpcs: Array<{ id: number; name: string; href: string }>;
  itemDrops: ZoneItemDropEntry[];
  forage: ZoneForageEntry[];
  tasks: Array<{ id: number; name: string; href: string }>;
  spawnGroups: SpawnGroupDetail[];
};

export type FactionSummary = {
  id: number;
  name: string;
  category: string;
  alignedZone: string;
  raisedByCount: number;
  loweredByCount: number;
};

export type FactionDetail = FactionSummary & {
  overview: string;
  raisedBy: Array<{ id: number; name: string; href: string }>;
  loweredBy: Array<{ id: number; name: string; href: string }>;
};

export type RecipeSummary = {
  id: number;
  name: string;
  tradeskill: string;
  trivial: number;
  result: string;
};

export type PetSummary = {
  id: number;
  spellId: number;
  spellName: string;
  spellIcon: string;
  ownerClass: string;
  ownerClassId: number;
  spellLevel: number;
  race: string;
  petLevel: number;
  petClass: string;
  hp: number;
  mana: number;
  ac: number;
  minDamage: number;
  maxDamage: number;
};

export type RecipeDetail = RecipeSummary & {
  container: string;
  notes: string;
  containers: Array<{ id: number; name: string; href?: string; icon: string }>;
  creates: Array<{ id: number; name: string; href: string; count: number; icon: string }>;
  ingredients: Array<{ id: number; name: string; href: string; count: number; icon: string }>;
};

export type PetDetail = {
  id: number;
  name: string;
  ownerClass: string;
  ownerClassId?: number;
  levelRange: string;
  grantedBy: { id: number; name: string; href: string };
  notes: string;
  spellLevel?: number;
  spellIcon?: string;
  race?: string;
  petLevel?: number;
  petClass?: string;
  hp?: number;
  mana?: number;
  ac?: number;
  minDamage?: number;
  maxDamage?: number;
};

export type TaskDetail = {
  id: number;
  title: string;
  zone: { shortName: string; longName: string; href: string };
  levelRange: string;
  reward: string;
  summary: string;
  objectives: string[];
};

export type CatalogStats = {
  items: number;
  spells: number;
  npcs: number;
  zones: number;
  factions: number;
  recipes: number;
  pets: number;
  tasks: number;
};

export type SchemaCapabilities = {
  databaseReachable: boolean;
  tables: Record<string, boolean>;
};
