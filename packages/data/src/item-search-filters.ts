export const itemClassNames = [
  "Warrior",
  "Cleric",
  "Paladin",
  "Ranger",
  "Shadow Knight",
  "Druid",
  "Monk",
  "Bard",
  "Rogue",
  "Shaman",
  "Necromancer",
  "Wizard",
  "Magician",
  "Enchanter",
  "Beastlord",
  "Berserker"
] as const;

export const itemClassFilterOptions = [...itemClassNames];

export const itemSlotFlags: ReadonlyArray<readonly [number, string]> = [
  [1, "Charm"],
  [2, "Ear"],
  [4, "Head"],
  [8, "Face"],
  [16, "Ear"],
  [32, "Neck"],
  [64, "Shoulders"],
  [128, "Arms"],
  [256, "Back"],
  [512, "Wrist"],
  [1024, "Wrist"],
  [2048, "Range"],
  [4096, "Hands"],
  [8192, "Primary"],
  [16384, "Secondary"],
  [32768, "Finger"],
  [65536, "Finger"],
  [131072, "Chest"],
  [262144, "Legs"],
  [524288, "Feet"],
  [1048576, "Waist"],
  [2097152, "Power Source"],
  [4194304, "Ammo"]
] as const;

export const itemSlotFilterOptions = [...new Set(itemSlotFlags.map(([, label]) => label))];
