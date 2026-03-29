import type {
  FactionDetail,
  ItemDetail,
  NpcDetail,
  PetDetail,
  RecipeDetail,
  SpellDetail,
  SpawnGroupDetail,
  TaskDetail,
  ZoneDetail
} from "./types";

export const items: ItemDetail[] = [
  {
    id: 1001,
    name: "Runed Mithril Bracer",
    type: "Armor",
    slot: "Wrist",
    classes: ["Warrior", "Paladin", "Shadow Knight"],
    tradeable: true,
    levelRequired: 35,
    zone: "Castle Mistmoore",
    ac: 18,
    hp: 35,
    mana: 0,
    damage: 0,
    delay: 0,
    icon: "bracer",
    lore: "A silvered wristguard etched with old Mistmoore heraldry.",
    flags: ["Magic"],
    classDisplay: "WAR PAL SHD",
    raceDisplay: "ALL",
    slotDisplay: "Wrist",
    size: "MEDIUM",
    weight: "0.4",
    skill: "Armor",
    itemTypeLabel: "Armor",
    recommendedLevel: 0,
    range: 0,
    attack: 0,
    haste: 0,
    endurance: 0,
    hpRegen: 0,
    manaRegen: 0,
    enduranceRegen: 0,
    damageBonus: 0,
    coinValue: { pp: 12, gp: 5, sp: 0, cp: 0 },
    augmentSlots: [{ slot: 1, type: 7 }],
    droppedInZones: [{ shortName: "mistmoore", longName: "Castle Mistmoore", href: "/zones/mistmoore" }],
    combatEffect: undefined,
    wornEffect: undefined,
    focusEffect: undefined,
    clickEffect: undefined,
    stats: [
      { label: "Armor Class", value: "18" },
      { label: "Hit Points", value: "+35" },
      { label: "Strength", value: "+6" },
      { label: "Magic Resist", value: "+8" }
    ],
    droppedBy: [{ id: 3001, name: "a mistmoore guard", href: "/npcs/3001" }],
    soldBy: [],
    usedInRecipes: [{ id: 9001, name: "Runed Reinforcement", href: "/recipes/9001" }]
  },
  {
    id: 1002,
    name: "Midnight Archivist's Staff",
    type: "2H Blunt",
    slot: "Primary / Secondary",
    classes: ["Cleric", "Wizard", "Enchanter"],
    tradeable: false,
    levelRequired: 52,
    zone: "The Plane of Knowledge",
    ac: 0,
    hp: 0,
    mana: 85,
    damage: 25,
    delay: 30,
    icon: "staff",
    lore: "A lacquered staff humming with planar script.",
    flags: ["Magic", "No Drop"],
    classDisplay: "CLR WIZ ENC",
    raceDisplay: "ALL",
    slotDisplay: "Primary, Secondary",
    size: "LARGE",
    weight: "4.0",
    skill: "2HB",
    itemTypeLabel: "2H Blunt",
    recommendedLevel: 0,
    range: 0,
    attack: 0,
    haste: 0,
    endurance: 0,
    hpRegen: 0,
    manaRegen: 0,
    enduranceRegen: 0,
    damageBonus: 35,
    coinValue: { pp: 88, gp: 0, sp: 0, cp: 0 },
    augmentSlots: [
      { slot: 1, type: 7 },
      { slot: 2, type: 8 }
    ],
    droppedInZones: [{ shortName: "poknowledge", longName: "The Plane of Knowledge", href: "/zones/poknowledge" }],
    combatEffect: { id: 2002, name: "Complete Heal", href: "/spells/2002", level: 52, chanceModifier: 100 },
    wornEffect: undefined,
    focusEffect: undefined,
    clickEffect: undefined,
    stats: [
      { label: "Damage / Delay", value: "25 / 30" },
      { label: "Mana", value: "+85" },
      { label: "Intelligence", value: "+12" },
      { label: "Focus", value: "Improved Healing III" }
    ],
    droppedBy: [{ id: 3002, name: "Matron V'Lyra", href: "/npcs/3002" }],
    soldBy: [],
    usedInRecipes: []
  },
  {
    id: 1003,
    name: "Traveler's Restorative Draught",
    type: "Potion",
    slot: "Inventory",
    classes: ["All"],
    tradeable: true,
    levelRequired: 1,
    zone: "The Plane of Knowledge",
    ac: 0,
    hp: 150,
    mana: 0,
    damage: 0,
    delay: 0,
    icon: "potion",
    lore: "A portable tonic sold to wayfarers heading into old ruins.",
    flags: ["Magic"],
    classDisplay: "ALL",
    raceDisplay: "ALL",
    slotDisplay: "Inventory",
    size: "SMALL",
    weight: "0.1",
    skill: "Consumable",
    itemTypeLabel: "Potion",
    recommendedLevel: 0,
    range: 0,
    attack: 0,
    haste: 0,
    endurance: 0,
    hpRegen: 0,
    manaRegen: 0,
    enduranceRegen: 0,
    damageBonus: 0,
    coinValue: { pp: 1, gp: 2, sp: 3, cp: 4 },
    augmentSlots: [],
    droppedInZones: [],
    combatEffect: undefined,
    wornEffect: undefined,
    focusEffect: undefined,
    clickEffect: { id: 2001, name: "Spirit of Wolf", href: "/spells/2001", level: 1, castType: "Clicky" },
    stats: [
      { label: "Effect", value: "Restores 150 HP" },
      { label: "Charges", value: "5" }
    ],
    droppedBy: [],
    soldBy: [{ id: 3003, name: "Scholar Alquen", href: "/npcs/3003" }],
    usedInRecipes: [{ id: 9002, name: "Traveler's Kit", href: "/recipes/9002" }]
  }
];

export const spells: SpellDetail[] = [
  {
    id: 2001,
    name: "Spirit of Wolf",
    icon: "638",
    classes: ["Druid", "Shaman"],
    className: "Druid",
    classLevel: "Druid 9",
    level: 9,
    skill: "Alteration",
    effect: "Movement speed increase",
    mana: 10,
    target: "Single target",
    description: "A classic run-speed buff with long duration.",
    classLevels: [
      { className: "Druid", level: 9 },
      { className: "Shaman", level: 14 }
    ],
    messages: [{ label: "When cast on you", text: "You feel your feet quicken." }],
    castTime: "3 sec",
    recoveryTime: "2.5 sec",
    recastTime: "0 sec",
    range: "100",
    duration: "36 min",
    resist: "Beneficial",
    resistAdjust: 0,
    interruptible: true,
    hateGenerated: 0,
    aoeRange: 0,
    aoeMaxTargets: 0,
    aoeDuration: "Instant",
    reagents: [],
    effects: [{ slot: 1, text: "Increase Movement by 45" }],
    itemSources: []
  },
  {
    id: 2002,
    name: "Complete Heal",
    icon: "18",
    classes: ["Cleric"],
    className: "Cleric",
    classLevel: "Cleric 39",
    level: 39,
    skill: "Alteration",
    effect: "Restores target to full health",
    mana: 400,
    target: "Single target",
    description: "The defining cleric heal for group and raid play.",
    classLevels: [{ className: "Cleric", level: 39 }],
    messages: [{ label: "When cast on you", text: "You are completely healed." }],
    castTime: "10 sec",
    recoveryTime: "2.5 sec",
    recastTime: "0 sec",
    range: "100",
    duration: "Instant",
    resist: "Beneficial",
    resistAdjust: 0,
    interruptible: true,
    hateGenerated: 0,
    aoeRange: 0,
    aoeMaxTargets: 0,
    aoeDuration: "Instant",
    reagents: [],
    effects: [{ slot: 1, text: "Complete Heal (with duration)" }],
    itemSources: []
  },
  {
    id: 2003,
    name: "Archivist's Ember",
    icon: "546",
    classes: ["Wizard", "Magician"],
    className: "Wizard",
    classLevel: "Wizard 54",
    level: 54,
    skill: "Evocation",
    effect: "Fire damage over time",
    mana: 225,
    target: "Single target",
    description: "A modernized sample nuke and DoT entry used by the mock catalog.",
    classLevels: [
      { className: "Wizard", level: 54 },
      { className: "Magician", level: 58 }
    ],
    messages: [
      { label: "When cast on you", text: "Cinders cling to your skin." },
      { label: "When fading", text: "The ember aura gutters out." }
    ],
    castTime: "4 sec",
    recoveryTime: "2.5 sec",
    recastTime: "6 sec",
    range: "200",
    duration: "24 sec",
    resist: "Fire",
    resistAdjust: -20,
    interruptible: true,
    hateGenerated: 0,
    aoeRange: 0,
    aoeMaxTargets: 0,
    aoeDuration: "Instant",
    reagents: [{ id: 1003, name: "Traveler's Restorative Draught", count: 1, href: "/items/1003" }],
    effects: [
      { slot: 1, text: "Decrease Hitpoints by 600" },
      { slot: 2, text: "Decrease Fire Resist by 35" }
    ],
    itemSources: [{ id: 1002, name: "Midnight Archivist's Staff", href: "/items/1002", icon: "staff" }]
  }
];

export const spawnGroups: SpawnGroupDetail[] = [
  {
    id: 7001,
    name: "Castle Hallway Patrol",
    zone: {
      shortName: "mistmoore",
      longName: "Castle Mistmoore",
      href: "/zones/mistmoore"
    },
    respawn: "22 minutes",
    locations: ["-150 / 420 / 12", "-130 / 389 / 12"],
    entries: [
      { id: 3001, name: "a mistmoore guard", chance: "70%", href: "/npcs/3001" },
      { id: 3002, name: "Matron V'Lyra", chance: "30%", href: "/npcs/3002" }
    ]
  }
];

export const npcs: NpcDetail[] = [
  {
    id: 3001,
    name: "a mistmoore guard",
    fullName: "a mistmoore guard",
    appearance: {
      raceId: 6,
      gender: 0,
      texture: 0,
      helmTexture: 0
    },
    race: "Dark Elf",
    level: "35 - 38",
    zone: "Castle Mistmoore",
    named: false,
    klass: "Warrior",
    hp: 9200,
    mana: 0,
    damage: "78 - 165",
    faction: "Mayong's Retainers",
    mainFaction: { id: 4001, name: "Mayong's Retainers", href: "/factions/4001" },
    attackDelay: 30,
    specialAttacks: [],
    spells: [],
    drops: [
      {
        lootdropId: 1,
        probability: 100,
        multiplier: 1,
        items: [
          {
            id: 1001,
            name: "Runed Mithril Bracer",
            href: "/items/1001",
            type: "Armor",
            icon: "bracer",
            chance: 25,
            globalChance: 25
          }
        ]
      }
    ],
    sells: [],
    spawnGroups: [{ id: 7001, name: "Castle Hallway Patrol", href: "/spawngroups/7001" }],
    spawnZones: [{ shortName: "mistmoore", longName: "Castle Mistmoore", href: "/zones/mistmoore" }],
    factionHits: {
      lowers: [{ id: 4001, name: "Mayong's Retainers", href: "/factions/4001", value: -25 }],
      raises: []
    }
  },
  {
    id: 3002,
    name: "Matron V'Lyra",
    fullName: "Matron V'Lyra",
    appearance: {
      raceId: 6,
      gender: 1,
      texture: 0,
      helmTexture: 0
    },
    race: "Dark Elf",
    level: "52",
    zone: "Castle Mistmoore",
    named: true,
    klass: "Cleric",
    hp: 24000,
    mana: 14000,
    damage: "160 - 260",
    faction: "Mayong's Retainers",
    mainFaction: { id: 4001, name: "Mayong's Retainers", href: "/factions/4001" },
    attackDelay: 26,
    specialAttacks: ["Enrage"],
    spells: [
      { id: 2002, name: "Complete Heal", href: "/spells/2002", type: "Heal", icon: "18" },
      { id: 2003, name: "Archivist's Ember", href: "/spells/2003", type: "Dot", icon: "546" }
    ],
    drops: [
      {
        lootdropId: 2,
        probability: 100,
        multiplier: 1,
        items: [
          {
            id: 1002,
            name: "Midnight Archivist's Staff",
            href: "/items/1002",
            type: "2HB",
            icon: "staff",
            chance: 10,
            globalChance: 10
          }
        ]
      }
    ],
    sells: [],
    spawnGroups: [{ id: 7001, name: "Castle Hallway Patrol", href: "/spawngroups/7001" }],
    spawnZones: [{ shortName: "mistmoore", longName: "Castle Mistmoore", href: "/zones/mistmoore" }],
    factionHits: {
      lowers: [{ id: 4001, name: "Mayong's Retainers", href: "/factions/4001", value: -100 }],
      raises: []
    }
  },
  {
    id: 3003,
    name: "Scholar Alquen",
    fullName: "Scholar Alquen",
    appearance: {
      raceId: 1,
      gender: 0,
      texture: 0,
      helmTexture: 0
    },
    race: "Human",
    level: "60",
    zone: "The Plane of Knowledge",
    named: true,
    klass: "Merchant",
    hp: 100000,
    mana: 0,
    damage: "0 - 0",
    faction: "Keepers of the Knowledge",
    mainFaction: { id: 4002, name: "Keepers of the Knowledge", href: "/factions/4002" },
    attackDelay: 30,
    specialAttacks: [],
    spells: [],
    drops: [],
    sells: [{ id: 1003, name: "Traveler's Restorative Draught", href: "/items/1003", icon: "potion", price: "1p 2g 3s 4c" }],
    spawnGroups: [],
    spawnZones: [{ shortName: "poknowledge", longName: "The Plane of Knowledge", href: "/zones/poknowledge" }],
    factionHits: {
      lowers: [],
      raises: [{ id: 4002, name: "Keepers of the Knowledge", href: "/factions/4002", value: 10 }]
    }
  }
];

export const factions: FactionDetail[] = [
  {
    id: 4001,
    name: "Mayong's Retainers",
    category: "Castle Faction",
    alignedZone: "Castle Mistmoore",
    overview: "The retainers who keep the Mistmoore estate functional and hostile to intruders.",
    raisedBy: [],
    loweredBy: [
      { id: 3001, name: "a mistmoore guard", href: "/npcs/3001" },
      { id: 3002, name: "Matron V'Lyra", href: "/npcs/3002" }
    ]
  },
  {
    id: 4002,
    name: "Keepers of the Knowledge",
    category: "City Faction",
    alignedZone: "The Plane of Knowledge",
    overview: "Scholars, guides, and quartermasters supporting travel across Norrath.",
    raisedBy: [{ id: 3003, name: "Scholar Alquen", href: "/npcs/3003" }],
    loweredBy: []
  }
];

export const recipes: RecipeDetail[] = [
  {
    id: 9001,
    name: "Runed Reinforcement",
    tradeskill: "Smithing",
    trivial: 188,
    result: "Runed Mithril Bracer",
    container: "Forge",
    notes: "A reinforcement step used by castle armorers.",
    containers: [{ id: 0, name: "Forge", icon: "" }],
    creates: [{ id: 1001, name: "Runed Mithril Bracer", href: "/items/1001", count: 1, icon: "bracer" }],
    ingredients: [
      { id: 1003, name: "Traveler's Restorative Draught", href: "/items/1003", count: 1, icon: "potion" }
    ]
  },
  {
    id: 9002,
    name: "Traveler's Kit",
    tradeskill: "Alchemy",
    trivial: 102,
    result: "Traveler's Restorative Draught",
    container: "Medicine Bag",
    notes: "A light utility combine for mock merchant stock.",
    containers: [{ id: 0, name: "Medicine Bag", icon: "" }],
    creates: [{ id: 1003, name: "Traveler's Restorative Draught", href: "/items/1003", count: 2, icon: "potion" }],
    ingredients: []
  }
];

export const pets: PetDetail[] = [
  {
    id: 5001,
    name: "Spirit Wolf Companion",
    ownerClass: "Shaman",
    ownerClassId: 10,
    levelRange: "34 - 49",
    grantedBy: { id: 2001, name: "Spirit of Wolf", href: "/spells/2001" },
    notes: "A fast scouting pet used here as a stand-in for legacy pet listings.",
    spellLevel: 34,
    spellIcon: "638",
    race: "Wolf",
    petLevel: 39,
    petClass: "Warrior",
    hp: 1850,
    mana: 0,
    ac: 420,
    minDamage: 58,
    maxDamage: 94
  }
];

export const tasks: TaskDetail[] = [
  {
    id: 6001,
    title: "The Count's Ledger",
    zone: {
      shortName: "mistmoore",
      longName: "Castle Mistmoore",
      href: "/zones/mistmoore"
    },
    levelRange: "35 - 55",
    reward: "Runed Mithril Bracer",
    summary: "Recover an old ledger from the archive wing and return it to the scout outside the gate.",
    objectives: [
      "Search the archive hall in Castle Mistmoore.",
      "Defeat Matron V'Lyra if she appears.",
      "Return the ledger to the quest giver."
    ]
  }
];

export const zones: ZoneDetail[] = [
  {
    id: 33,
    shortName: "mistmoore",
    longName: "Castle Mistmoore",
    spawns: 142,
    era: "Classic",
    levelRange: "30 - 55",
    population: "Undead, nobles, and castle guards",
    safePoint: "-178 / 44 / 3",
    resources: [
      { label: "Bestiary", href: "/zones/mistmoore?mode=npcs" },
      { label: "Named mobs", href: "/zones/mistmoore/named" },
      { label: "Equipment", href: "/zones/mistmoore?mode=items" },
      { label: "Spawn groups", href: "/zones/mistmoore?mode=spawngroups" },
      { label: "Tasks", href: "/zones/mistmoore?mode=tasks" }
    ],
    bestiary: [
      { id: 3001, name: "a mistmoore guard", href: "/npcs/3001" },
      { id: 3002, name: "Matron V'Lyra", href: "/npcs/3002" }
    ],
    namedNpcs: [{ id: 3002, name: "Matron V'Lyra", href: "/npcs/3002" }],
    itemDrops: [
      { id: 1001, name: "Runed Mithril Bracer", href: "/items/1001" },
      { id: 1002, name: "Midnight Archivist's Staff", href: "/items/1002" }
    ],
    forage: [],
    tasks: [{ id: 6001, name: "The Count's Ledger", href: "/tasks/6001" }],
    spawnGroups
  },
  {
    id: 202,
    shortName: "poknowledge",
    longName: "The Plane of Knowledge",
    spawns: 64,
    era: "Planes of Power",
    levelRange: "1 - 65",
    population: "Merchants, spell vendors, and portal traffic",
    safePoint: "825 / -65 / -159",
    resources: [
      { label: "Bestiary", href: "/zones/poknowledge?mode=npcs" },
      { label: "Equipment", href: "/zones/poknowledge?mode=items" }
    ],
    bestiary: [{ id: 3003, name: "Scholar Alquen", href: "/npcs/3003" }],
    namedNpcs: [{ id: 3003, name: "Scholar Alquen", href: "/npcs/3003" }],
    itemDrops: [{ id: 1003, name: "Traveler's Restorative Draught", href: "/items/1003" }],
    forage: [],
    tasks: [],
    spawnGroups: []
  }
];
