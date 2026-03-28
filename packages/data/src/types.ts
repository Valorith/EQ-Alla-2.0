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
  stats: Array<{ label: string; value: string }>;
  droppedBy: Array<{ id: number; name: string; href: string }>;
  soldBy: Array<{ id: number; name: string; href: string }>;
  usedInRecipes: Array<{ id: number; name: string; href: string }>;
};

export type SpellSummary = {
  id: number;
  name: string;
  classes: string[];
  level: number;
  skill: string;
  effect: string;
  mana: number;
  target: string;
};

export type SpellDetail = SpellSummary & {
  mana: number;
  target: string;
  duration: string;
  resist: string;
  description: string;
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
  klass: string;
  hp: number;
  damage: string;
  faction: string;
  spells: Array<{ id: number; name: string; href: string }>;
  drops: Array<{ id: number; name: string; href: string }>;
  sells: Array<{ id: number; name: string; href: string }>;
  spawnGroups: Array<{ id: number; name: string; href: string }>;
};

export type ZoneSummary = {
  shortName: string;
  longName: string;
  era: string;
  levelRange: string;
  population: string;
};

export type SpawnGroupDetail = {
  id: number;
  name: string;
  zone: { shortName: string; longName: string; href: string };
  respawn: string;
  locations: string[];
  entries: Array<{ id: number; name: string; chance: string; href: string }>;
};

export type ZoneDetail = ZoneSummary & {
  safePoint: string;
  resources: Array<{ label: string; href: string }>;
  bestiary: Array<{ id: number; name: string; href: string }>;
  namedNpcs: Array<{ id: number; name: string; href: string }>;
  itemDrops: Array<{ id: number; name: string; href: string }>;
  forage: Array<{ id: number; name: string; href: string }>;
  tasks: Array<{ id: number; name: string; href: string }>;
  spawnGroups: SpawnGroupDetail[];
};

export type FactionSummary = {
  id: number;
  name: string;
  category: string;
  alignedZone: string;
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

export type RecipeDetail = RecipeSummary & {
  container: string;
  notes: string;
  creates: Array<{ id: number; name: string; href: string; count: number }>;
  ingredients: Array<{ id: number; name: string; href: string; count: number }>;
};

export type PetDetail = {
  id: number;
  name: string;
  ownerClass: string;
  levelRange: string;
  grantedBy: { id: number; name: string; href: string };
  notes: string;
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
