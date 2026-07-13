const ignoredSpellEffectIds = new Set([254]);
const negativeValuesThatStillRepresentIncreases = new Set([59]);
const spireSpellEffectFallbackNames: Record<number, string> = {
  34: "Confuse",
  43: "Berserk",
  84: "Gravity Flux",
  122: "Reduce Skill",
  126: "Focus: Spell Resist Rate",
  133: "Focus: Spell Stun Duration",
  144: "Limit: Max Casting Time",
  146: "Portal Locations",
  155: "Increase Spell Critical Damage",
  160: "Intoxicate",
  161: "Mitigate Spell Damage Rune",
  162: "Mitigate Melee Damage Rune",
  163: "Absorb Damage",
  164: "Sense LDoN Chest",
  165: "Disarm LDoN Trap",
  170: "Increase Spell Critical Chance",
  187: "Balance Party Mana",
  189: "Increase Endurance",
  190: "Increase Max Endurance",
  191: "Amnesia",
  193: "Skill Attack",
  196: "Increase Strikethrough Chance",
  197: "Skill Damage Taken",
  198: "Instant Endurance",
  199: "Taunt",
  201: "Range Proc Modifier",
  202: "Project Illusion",
  203: "Mass Group Buff",
  204: "Group Fear Immunity",
  207: "Flesh to Bone",
  209: "Dispel Beneficial",
  210: "Pet Shielding",
  213: "Increase Pet Max HP",
  214: "Change Max HP",
  219: "Slay Undead",
  220: "Skill Damage Bonus",
  221: "Reduce Weight",
  222: "Increase Chance to Block From Behind",
  224: "Increase Additional Riposte Chance",
  225: "Increase Chance to Double Attack",
  232: "Divine Save",
  233: "Decrease Metabolism",
  243: "Decrease Charm Break Chance",
  244: "Decrease Root Break Chance",
  246: "Increase Lung Capacity",
  250: "Increase Spell Proc Chance",
  258: "Increase Triple Backstab Chance",
  259: "AC Soft Cap",
  260: "Instrument Modifier",
  262: "Raise Stat Cap",
  264: "Reduce AA Timer",
  265: "No Fizzle",
  270: "Increase Bard Song Range",
  271: "Increase Base Run Speed",
  272: "Increase Effective Casting Level",
  274: "Increase Chance to Critical Heal",
  275: "Increase Chance to Critical Mend",
  278: "Finishing Blow",
  279: "Increase Flurry Chance",
  280: "Increase Pet Flurry Chance",
  286: "Focus: Spell Damage Amount",
  287: "Focus: Buff Duration by Ticks",
  291: "Purify",
  292: "Increase Strikethrough Chance",
  296: "Focus: Incoming Spell Damage",
  297: "Focus: Incoming Spell Damage Amount",
  298: "Change Pet Size",
  300: "Summon Doppelganger",
  302: "Focus: Spell Damage Before Critical",
  303: "Focus: Spell Damage Amount",
  305: "Increase Offhand Damage Shield Mitigation",
  306: "Wake the Dead",
  307: "Appraisal",
  308: "Zone Suspend Minion",
  309: "Gate to Caster Bind Point",
  310: "Reduce Reuse Timer",
  312: "Sanctuary",
  315: "Improved Invisibility versus Undead",
  317: "Increase Worn HP Regeneration Cap",
  318: "Increase Worn Mana Regeneration Cap",
  319: "Increase Chance to Critical HoT",
  320: "Increase Shield Block Chance",
  321: "Reduce Target Hate",
  324: "Use HP Instead of Mana",
  328: "Max Negative HP",
  329: "Mana Shield Absorb Damage",
  334: "Bard AE Dot",
  337: "Increase Experience Gain",
  338: "Expedient Recovery",
  341: "Increase Worn Attack Cap",
  342: "Prevent Flee at Low Health",
  343: "Increase Spell Interrupt Chance",
  348: "Limit: Min Mana Cost",
  350: "Manaburn",
  351: "Aura Effect",
  352: "Increase Trap Count",
  353: "Aura Count",
  354: "Deactivate All Traps",
  355: "Learn Trap",
  357: "Focus: Mute",
  358: "Mana Once",
  359: "Passive Sense Trap",
  364: "Increase Triple Attack Chance",
  366: "Group Shielding",
  367: "Modify Body Type",
  368: "Modify Faction",
  369: "Increase Corruption Counter",
  370: "Increase Corruption Resist",
  371: "Attack Speed: Inhibit Melee",
  375: "Increase Critical DoT Damage",
  376: "Fling",
  378: "Increase Spell Effect Resist Chance",
  379: "Directional Shadowstep",
  380: "Knockback",
  381: "Fling Target to Caster",
  382: "Negate Spell Effect",
  384: "Fling Caster to Target",
  385: "Limit: Spell Group",
  388: "Summon All Corpses",
  398: "Focus: Swarm Pet Duration",
  399: "Focus: Twincast Chance",
  400: "Heal Group From Mana",
  401: "Damage for Amount Mana Drained",
  402: "Damage for Amount Endurance Drained",
  403: "Limit: Spell Class",
  404: "Limit: Spell Subclass",
  406: "Trigger Spell on Hit Count Fade",
  407: "Trigger Spell on Focus Effect Success",
  408: "Heal Up To Percent Limit",
  409: "Restore Mana Up To Percent Limit",
  410: "Restore Endurance Up To Percent Limit",
  411: "Limit: Class",
  413: "Focus: Base Spell Value",
  414: "Limit: Casting Skill",
  416: "Increase AC",
  417: "Increase Mana Regeneration",
  418: "Skill Damage Bonus",
  419: "Add Melee Proc",
  424: "Gravitate",
  425: "Fly",
  430: "Alter Vision",
  431: "Tint Vision",
  427: "Add Skill Proc",
  428: "Limit: Skill",
  429: "Add Skill Proc on Successful Hit",
  436: "Toggle Freeze Buff Timers",
  437: "Teleport to Anchor",
  438: "Translocate to Anchor",
  441: "Distance Buff Removal",
  442: "Trigger Spell on Target Requirement",
  443: "Trigger Spell on Caster Requirement",
  444: "Improved Taunt",
  445: "Add Mercenary Slot",
  446: "A Stacker",
  447: "B Stacker",
  448: "C Stacker",
  449: "D Stacker",
  453: "Trigger Spell on Melee Threshold",
  454: "Trigger Spell on Spell Threshold",
  451: "Melee Threshold Guard",
  452: "Spell Threshold Guard",
  455: "Modify Hate Percent",
  456: "Modify Hate Over Time Percent",
  457: "Resource Tap",
  458: "Modify Faction Percent",
  459: "Skill Damage Modifier",
  450: "Absorb Damage Over Time Rune",
  476: "Weapon Stance",
  523: "Instant Endurance Percent",
  526: "Current Endurance"
};
const spellEffectReferenceNames: Record<number, string> = {
  0: "Current HP",
  11: "Attack Speed",
  15: "Mana",
  59: "Damage Shield",
  79: "Current HP",
  100: "Current HP"
};

const spellEffectNames: Record<number, string> = {
  0: "Increase Hitpoints",
  1: "Increase AC",
  2: "Increase ATK",
  3: "In/Decrease Movement",
  4: "Increase STR",
  5: "Increase DEX",
  6: "Increase AGI",
  7: "Increase STA",
  8: "Increase INT",
  9: "Increase WIS",
  10: "Increase CHA",
  11: "In/Decrease Attack Speed",
  12: "Invisibility",
  13: "See Invisible",
  14: "Water Breathing",
  15: "Increase Mana",
  18: "Pacify",
  19: "Increase Faction",
  20: "Blindness",
  21: "Stun",
  22: "Charm",
  23: "Fear",
  24: "Reduce Endurance Upkeep",
  25: "Bind Affinity",
  26: "Gate",
  27: "Cancel Magic",
  28: "Invisibility versus Undead",
  29: "Invisibility versus Animals",
  30: "Frenzy Radius",
  31: "Mesmerize",
  32: "Summon Item",
  33: "Summon Pet:",
  35: "Increase Disease Counter",
  36: "Increase Poison Counter",
  40: "Invulnerability",
  41: "Destroy Target",
  42: "Shadowstep",
  44: "Delayed Heal / Lycanthropy Marker",
  46: "Increase Fire Resist",
  47: "Increase Cold Resist",
  48: "Increase Poison Resist",
  49: "Increase Disease Resist",
  50: "Increase Magic Resist",
  52: "Sense Undead",
  53: "Sense Summoned",
  54: "Sense Animals",
  55: "Increase Absorb Damage",
  56: "True North",
  57: "Levitate",
  58: "Illusion:",
  59: "Increase Damage Shield",
  61: "Identify",
  63: "Memblur Chance",
  64: "SpinStun",
  65: "Infravision",
  66: "Ultravision",
  67: "Eye Of Zomm",
  68: "Reclaim Energy",
  69: "Increase Max Hitpoints",
  71: "Summon Skeleton Pet:",
  73: "Bind Sight",
  74: "Feign Death Chance",
  75: "Voice Graft",
  76: "Sentinel",
  77: "Locate Corpse",
  78: "Increase Absorb Magic Damage",
  79: "Increase HP when cast",
  81: "Resurrect",
  82: "Summon PC",
  83: "Teleport",
  85: "Add Proc:",
  86: "Reaction Radius",
  87: "Increase Magnification",
  88: "Evacuate",
  89: "Increase Player Size",
  90: "Cloak",
  91: "Summon Corpse",
  92: "Increase Hate",
  93: "Stop Rain",
  94: "Make Fragile (Delete if combat)",
  95: "Sacrifice",
  96: "Silence",
  97: "Increase Mana Pool",
  98: "Increase Haste v2",
  99: "Root",
  100: "Increase Hitpoints v2",
  101: "Complete Heal (with duration)",
  102: "Fearless",
  103: "Call Pet",
  104: "Translocate target to their bind point",
  105: "Anti-Gate",
  106: "Summon Warder:",
  108: "Summon Familiar:",
  109: "Summon Item v2",
  111: "Increase All Resists",
  112: "Increase Effective Casting Level",
  113: "Summon Horse:",
  114: "Increase Aggro Multiplier",
  115: "Food/Water",
  116: "Increase Curse Counter",
  117: "Make Weapons Magical",
  118: "Increase Singing Skill",
  119: "Increase Haste v3",
  120: "Set Healing Effectiveness",
  121: "Reverse Damage Shield",
  123: "Screech",
  124: "Increase Spell Damage",
  125: "Increase Spell Healing",
  127: "Increase Spell Haste",
  128: "Increase Spell Duration",
  129: "Increase Spell Range",
  130: "Decrease Spell/Bash Hate",
  131: "Decrease Chance of Using Reagent",
  132: "Decrease Spell Mana Cost",
  134: "Limit: Max Level",
  135: "Limit: Resist(Magic allowed)",
  136: "Limit: Target",
  137: "Limit: Effect(Hitpoints allowed)",
  138: "Limit: Spell Type(Detrimental only)",
  139: "Limit: Spell",
  140: "Limit: Min Duration",
  141: "Limit: Instant spells only",
  142: "Limit: Min Level",
  143: "Limit: Min Casting Time",
  145: "Teleport v2",
  147: "Increase Hitpoints",
  148: "Block new spell",
  149: "Stacking: Overwrite existing spell",
  150: "Death Save - Restore Full Health",
  151: "Suspend Pet - Lose Buffs and Equipment",
  152: "Summon Pets:",
  153: "Balance Party Health",
  154: "Remove Detrimental",
  156: "Illusion: Target",
  157: "Damage Spell Caster",
  158: "Increase Chance to Reflect Spell",
  159: "Increase All Stats",
  167: "Pet Power Increase",
  168: "Increase Melee Mitigation",
  169: "Increase Chance to Critical Hit",
  171: "Increase Chance to Crippling Blow",
  172: "Increase Chance to Avoid Melee",
  173: "Increase Chance to Riposte",
  174: "Increase Chance to Dodge",
  175: "Increase Chance to Parry",
  176: "Increase Chance to Dual Wield",
  177: "Increase Chance to Double Attack",
  178: "Lifetap from Weapon Damage",
  179: "Instrument Modifier",
  180: "Increase Chance to Resist Spell",
  181: "Increase Chance to Resist Fear Spell",
  182: "Hundred Hands Effect",
  183: "Increase All Skills Skill Check",
  184: "Increase Chance to Hit With all Skills",
  185: "Increase All Skills Damage Modifier",
  186: "Increase All Skills Minimum Damage Modifier",
  188: "Increase Chance to Block",
  192: "Increase Hate",
  194: "Fade",
  195: "Stun Resist",
  200: "Increase Proc Modifier",
  201: "Increase Range Proc Modifier",
  205: "Rampage",
  206: "Area of Effect Taunt",
  211: "AE Melee",
  216: "Increase Accuracy",
  227: "Reduce Skill Timer",
  266: "Increase Attack Chance",
  273: "Increase Critical Dot Chance",
  289: "Improved Spell Effect:",
  294: "Increase Critical Spell Chance",
  299: "Wake the Dead",
  311: "Limit: Combat Skills Not Allowed",
  314: "Fixed Duration Invisibility",
  323: "Add Defensive Proc:",
  331: "Salvage",
  332: "Summon to Corpse",
  333: "Trigger Spell On Rune Fade",
  335: "Focus: Block Next Spell",
  339: "Focus: Trigger on Cast",
  340: "Spell Trigger: Only One Spell Cast",
  360: "Trigger Spell On Kill Shot",
  361: "Trigger Spell On Death",
  365: "Trigger Spell on Spell Kill Shot",
  373: "Cast Spell On Fade",
  374: "Spell Trigger: Apply Each Spell",
  377: "Cast Spell On Fade",
  383: "Focus: Proc on Spell Cast",
  386: "Trigger Spell on Curer",
  387: "Trigger Spell on Cure",
  389: "Focus: Spell Gem Refresh",
  390: "Focus: Spell Gem Lockout",
  391: "Limit: Max Mana",
  392: "Focus: Healing Amount",
  393: "Focus: Incoming Healing Effectiveness",
  394: "Focus: Incoming Healing Amount",
  395: "Focus: Incoming Healing Effectiveness",
  396: "Focus: Healing Amount",
  330: "Critical Damage Mob"
};

function normalizeSpellEffectName(name: string) {
  return name.replace(/:\s*$/, "").replace(/\s+/g, " ").trim();
}

export function getSpellEffectName(effectId: number) {
  const fallbackName = spireSpellEffectFallbackNames[effectId];
  return normalizeSpellEffectName(spellEffectNames[effectId] ?? fallbackName ?? `Effect ${effectId}`);
}

export function getReferenceSpellEffectName(effectId: number) {
  const preferredName = spellEffectReferenceNames[effectId];

  if (preferredName) {
    return normalizeSpellEffectName(preferredName);
  }

  const label = getSpellEffectName(effectId);

  return normalizeSpellEffectName(
    label
      .replace(/^Focus:\s*/, "")
      .replace(/^(Increase|Decrease)\s+/, "")
  );
}

export function resolveSpellEffectDirection(label: string, value: number, effectId?: number) {
  switch (effectId) {
    case 11:
      return value < 100 ? "Decrease Attack Speed" : "Increase Attack Speed";
    case 24:
      return value < 0 ? "Increase Endurance Upkeep" : "Reduce Endurance Upkeep";
    case 89:
      return value < 100 ? "Decrease Player Size" : "Increase Player Size";
    case 98:
      return value < 100 ? "Decrease Haste v2" : "Increase Haste v2";
    case 168:
      return value < 0 ? "Increase Melee Mitigation" : "Decrease Melee Mitigation";
    case 321:
      return value < 0 ? "Increase Target Hate" : "Reduce Target Hate";
  }

  if (label.includes("In/Decrease")) {
    return label.replace("In/Decrease", value < 0 ? "Decrease" : "Increase");
  }

  if (value < 0 && effectId !== undefined && negativeValuesThatStillRepresentIncreases.has(effectId)) {
    return label;
  }

  if (label.startsWith("Increase") && value < 0) {
    return label.replace("Increase", "Decrease");
  }

  if (label.startsWith("Decrease") && value < 0) {
    return label.replace("Decrease", "Increase");
  }

  return label;
}

export function summarizeSpellEffects(row: Record<string, unknown>) {
  const labels: string[] = [];

  for (let slot = 1; slot <= 12; slot += 1) {
    const effectId = Number(row[`effectid${slot}`] ?? 254);

    if (!Number.isFinite(effectId) || effectId < 0 || ignoredSpellEffectIds.has(effectId)) {
      continue;
    }

    const base = Number(row[`effect_base_value${slot}`] ?? 0);
    const formula = Number(row[`formula${slot}`] ?? 100);
    if (effectId === 10 && base === 0 && formula === 100) {
      continue;
    }

    const max = Number(row[`max${slot}`] ?? 0);
    const label = effectId === 305
      ? `${base < 0 && max <= 0 ? "Decrease" : "Increase"} Offhand Damage Shield Mitigation`
      : resolveSpellEffectDirection(getSpellEffectName(effectId), base, effectId);

    if (label && !labels.includes(label)) {
      labels.push(label);
    }
  }

  return labels.slice(0, 4).join(" • ") || "—";
}
