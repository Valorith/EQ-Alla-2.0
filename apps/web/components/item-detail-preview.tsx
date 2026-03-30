import Link from "next/link";
import type { ReactNode } from "react";
import type { ItemDetail } from "@eq-alla/data";
import { ItemIcon } from "./item-icon";

const classAbbreviations: Record<string, string> = {
  Bard: "BRD",
  Beastlord: "BST",
  Berserker: "BER",
  Cleric: "CLR",
  Druid: "DRU",
  Enchanter: "ENC",
  Magician: "MAG",
  Monk: "MNK",
  Necromancer: "NEC",
  Paladin: "PAL",
  Ranger: "RNG",
  Rogue: "ROG",
  "Shadow Knight": "SHD",
  Shaman: "SHM",
  Warrior: "WAR",
  Wizard: "WIZ"
};

const raceAbbreviations: Record<string, string> = {
  Barbarian: "BAR",
  "Dark Elf": "DEF",
  Dwarf: "DWF",
  "Wood Elf": "ELF",
  Erudite: "ERU",
  Gnome: "GNM",
  "Half Elf": "HEF",
  "Half-Elf": "HEF",
  Halfling: "HFL",
  "High Elf": "HIE",
  Human: "HUM",
  Iksar: "IKS",
  Ogre: "OGR",
  Troll: "TRL",
  Froglok: "FRG",
  "Vah Shir": "VAH",
  Drakkin: "DRK"
};

function abbreviateClassDisplay(value: string) {
  if (!value || value === "ALL") {
    return value;
  }

  let normalized = value;
  for (const [fullName, abbreviation] of Object.entries(classAbbreviations)) {
    normalized = normalized.replaceAll(fullName, abbreviation);
  }

  return normalized.replaceAll(",", " ").replace(/\s+/g, " ").trim();
}

function abbreviateRaceDisplay(value: string) {
  if (!value || value === "ALL") {
    return value;
  }

  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((race) => raceAbbreviations[race] ?? race)
    .join(" ");
}

function StatPairRow({
  label,
  value,
  alignValueRight = false,
  allowWrap = false
}: {
  label: string;
  value: ReactNode;
  alignValueRight?: boolean;
  allowWrap?: boolean;
}) {
  return (
    <div
      className={`items-baseline gap-2.5 text-[14px] leading-5 ${
        alignValueRight ? "grid grid-cols-[minmax(0,1fr)_auto]" : "grid grid-cols-[auto_minmax(0,1fr)]"
      }`}
    >
      <div className="shrink-0 whitespace-nowrap font-semibold text-[#d8ceb4]">{label}:</div>
      <div
        className={`min-w-0 text-[#e6e0d2] ${
          alignValueRight ? "text-right tabular-nums whitespace-nowrap" : allowWrap ? "break-words whitespace-normal" : "whitespace-nowrap"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StatPairList({
  rows,
  alignValuesRight = false
}: {
  rows: Array<{ label: string; value: ReactNode; show?: boolean }>;
  alignValuesRight?: boolean;
}) {
  return (
    <div className="space-y-px">
      {rows
        .filter((row) => row.show !== false)
        .map((row) => (
          <StatPairRow key={row.label} label={row.label} value={row.value} alignValueRight={alignValuesRight} />
        ))}
    </div>
  );
}

function EffectBlock({
  title,
  effect
}: {
  title: string;
  effect?:
    | {
        id: number;
        name: string;
        href: string;
        level?: number;
        chanceModifier?: number;
        castType?: string;
      }
    | undefined;
}) {
  if (!effect) {
    return null;
  }

  return (
    <div className="space-y-px text-[14px] leading-5 text-[#e6e0d2]">
      <div>
        <span className="font-semibold text-[#d8ceb4]">{title}: </span>
        <Link
          href={effect.href}
          className="font-medium text-[#7ab8ff] underline decoration-[1.5px] underline-offset-2 transition hover:text-[#a7d2ff] hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ab8ff]/35"
        >
          {effect.name}
        </Link>
      </div>
      {effect.level ? (
        <div>
          <span className="font-semibold text-[#d8ceb4]">Level for effect: </span>
          <span>{effect.level}</span>
        </div>
      ) : null}
      {typeof effect.chanceModifier === "number" ? (
        <div>
          <span className="font-semibold text-[#d8ceb4]">Effect chance modifier: </span>
          <span>{effect.chanceModifier}%</span>
        </div>
      ) : null}
      {effect.castType ? (
        <div>
          <span className="font-semibold text-[#d8ceb4]">Cast type: </span>
          <span>{effect.castType}</span>
        </div>
      ) : null}
    </div>
  );
}

function CoinPill({ label, value, src }: { label: string; value: number; src: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="tabular-nums">{value}</span>
      <img src={src} alt="" aria-hidden="true" className="size-[14px] object-contain" title={label} />
    </span>
  );
}

export function ItemDetailPreview({ item, className = "" }: { item: ItemDetail; className?: string }) {
  const isWeapon = item.damage > 0;
  const classDisplay = abbreviateClassDisplay(item.classDisplay);
  const raceDisplay = abbreviateRaceDisplay(item.raceDisplay);

  const overviewRows = [
    { label: "Size", value: item.size },
    { label: "Weight", value: item.weight },
    { label: isWeapon ? "Skill" : "Item Type", value: isWeapon ? item.skill : item.itemTypeLabel }
  ];

  const primaryValueRows = isWeapon
    ? [
        { label: "Base Damage", value: item.damage, show: item.damage > 0 },
        { label: "Delay", value: item.delay, show: item.delay > 0 },
        { label: "Damage bonus", value: item.damageBonus, show: item.damageBonus > 0 },
        { label: "Range", value: item.range, show: item.range > 0 }
      ]
    : [
        { label: "AC", value: item.ac, show: item.ac > 0 },
        { label: "HP", value: item.hp, show: item.hp > 0 },
        { label: "Mana", value: item.mana, show: item.mana > 0 },
        { label: "End", value: item.endurance, show: item.endurance > 0 }
      ];

  const attributeRows = [
    { label: "Strength", value: item.stats.find((entry) => entry.label === "Strength")?.value, show: item.stats.some((entry) => entry.label === "Strength") },
    { label: "Stamina", value: item.stats.find((entry) => entry.label === "Stamina")?.value, show: item.stats.some((entry) => entry.label === "Stamina") },
    { label: "Intelligence", value: item.stats.find((entry) => entry.label === "Intelligence")?.value, show: item.stats.some((entry) => entry.label === "Intelligence") },
    { label: "Wisdom", value: item.stats.find((entry) => entry.label === "Wisdom")?.value, show: item.stats.some((entry) => entry.label === "Wisdom") },
    { label: "Agility", value: item.stats.find((entry) => entry.label === "Agility")?.value, show: item.stats.some((entry) => entry.label === "Agility") },
    { label: "Dexterity", value: item.stats.find((entry) => entry.label === "Dexterity")?.value, show: item.stats.some((entry) => entry.label === "Dexterity") },
    { label: "Charisma", value: item.stats.find((entry) => entry.label === "Charisma")?.value, show: item.stats.some((entry) => entry.label === "Charisma") }
  ];

  const resistRows = [
    { label: "Magic Resist", value: item.stats.find((entry) => entry.label === "Magic Resist")?.value, show: item.stats.some((entry) => entry.label === "Magic Resist") },
    { label: "Fire Resist", value: item.stats.find((entry) => entry.label === "Fire Resist")?.value, show: item.stats.some((entry) => entry.label === "Fire Resist") },
    { label: "Cold Resist", value: item.stats.find((entry) => entry.label === "Cold Resist")?.value, show: item.stats.some((entry) => entry.label === "Cold Resist") },
    { label: "Disease Resist", value: item.stats.find((entry) => entry.label === "Disease Resist")?.value, show: item.stats.some((entry) => entry.label === "Disease Resist") },
    { label: "Poison Resist", value: item.stats.find((entry) => entry.label === "Poison Resist")?.value, show: item.stats.some((entry) => entry.label === "Poison Resist") }
  ];

  const utilityRows = [
    { label: "HP Regen", value: item.hpRegen, show: item.hpRegen > 0 },
    { label: "Mana Regen", value: item.manaRegen, show: item.manaRegen > 0 },
    { label: "Endurance Regen", value: item.enduranceRegen, show: item.enduranceRegen > 0 },
    { label: "Attack", value: item.attack, show: item.attack > 0 && !isWeapon },
    { label: "Haste", value: `${item.haste}%`, show: item.haste > 0 },
    { label: "Req Level", value: item.levelRequired, show: item.levelRequired > 0 },
    { label: "Rec Level", value: item.recommendedLevel, show: item.recommendedLevel > 0 }
  ];

  return (
    <section
      className={`rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(23,29,38,0.96),rgba(14,19,27,0.94))] px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.3)] backdrop-blur-sm sm:px-4 sm:py-3 ${className}`.trim()}
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start">
          <div className="shrink-0 pt-1">
            <ItemIcon icon={item.icon} name={item.name} size="xs" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <h2 className="text-[21px] font-medium leading-tight tracking-[-0.03em] text-[#f2ead9]">{item.name}</h2>
            <div className="space-y-px text-[14px] leading-5 text-[#e6e0d2]">
              {item.flags.map((flag) => (
                <div key={flag}>{flag}</div>
              ))}
              <StatPairRow label="Class" value={classDisplay} allowWrap />
              <StatPairRow label="Race" value={raceDisplay} allowWrap />
              <div className="break-words font-semibold text-[#e9dfc5]">{item.slotDisplay}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid justify-start gap-x-4 gap-y-2.5 sm:grid-cols-[235px_185px]">
            <StatPairList rows={overviewRows} alignValuesRight />
            <StatPairList rows={primaryValueRows} alignValuesRight />
          </div>

          <div className="grid justify-start gap-x-4 gap-y-2.5 sm:grid-cols-[175px_195px_170px]">
            <StatPairList rows={attributeRows} alignValuesRight />
            <StatPairList rows={resistRows} alignValuesRight />
            <StatPairList rows={utilityRows} alignValuesRight />
          </div>
        </div>

        {item.augmentSlots.length > 0 ? (
          <div className="space-y-0.5">
            {item.augmentSlots.map((slot) => (
              <div key={slot.slot} className="flex items-center gap-2 text-[14px] leading-5">
                <span
                  aria-hidden="true"
                  className="size-3.5 rounded-[3px] border border-[#7a8798]/70 bg-[linear-gradient(180deg,rgba(90,101,118,0.95),rgba(53,62,75,0.95))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.28)]"
                />
                <span>
                  <span className="font-semibold text-[#d8ceb4]">Slot {slot.slot}: </span>
                  <span>Type {slot.type}</span>
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-0.5">
          <EffectBlock title="Combat Effect" effect={item.combatEffect} />
          <EffectBlock title="Worn Effect" effect={item.wornEffect} />
          <EffectBlock title="Focus Effect" effect={item.focusEffect} />
          <EffectBlock title="Click Effect" effect={item.clickEffect} />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[14px] leading-5">
          <span className="font-semibold text-[#d8ceb4]">Value:</span>
          <div className="flex flex-wrap items-center gap-2">
            <CoinPill label="PP" value={item.coinValue.pp} src="/coins/pp.png" />
            <CoinPill label="GP" value={item.coinValue.gp} src="/coins/gp.png" />
            <CoinPill label="SP" value={item.coinValue.sp} src="/coins/sp.png" />
            <CoinPill label="CP" value={item.coinValue.cp} src="/coins/cp.png" />
          </div>
        </div>
      </div>
    </section>
  );
}
