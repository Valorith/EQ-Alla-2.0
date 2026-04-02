import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { ItemDetail } from "@eq-alla/data";
import { CoinDisplay } from "./coin-display";
import { ItemIcon } from "./item-icon";

type StatRow = { label: string; value: ReactNode; show?: boolean };

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
  rows: StatRow[];
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

function hasVisibleRows(rows: StatRow[]) {
  return rows.some((row) => row.show !== false);
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
          className="font-semibold text-sky-300 underline underline-offset-3 decoration-2 transition hover:text-sky-200 hover:decoration-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/35"
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

export function ItemDetailPreview({ item, className = "" }: { item: ItemDetail; className?: string }) {
  const isWeapon = item.damage > 0;
  const classDisplay = abbreviateClassDisplay(item.classDisplay);
  const raceDisplay = abbreviateRaceDisplay(item.raceDisplay);
  const hasCoinValue = item.coinValue.pp > 0 || item.coinValue.gp > 0 || item.coinValue.sp > 0 || item.coinValue.cp > 0;
  const modifierLabels = new Set(["Skill Mod", "Bard Modifier"]);
  const isModifierStat = (entry: ItemDetail["stats"][number]) =>
    modifierLabels.has(entry.label) ||
    (entry.section === "offense" && entry.label.endsWith(" Damage") && String(entry.value).startsWith("+"));
  const isTopDamageStat = (entry: ItemDetail["stats"][number]) =>
    entry.section === "offense" &&
    !isModifierStat(entry) &&
    (entry.label.endsWith(" Dmg") || entry.label === "Bane Damage" || entry.label === "Bane Damage (Race)");
  const statRowsForSections = (...sections: Array<ItemDetail["stats"][number]["section"]>) =>
    item.stats
      .filter((entry) => sections.includes(entry.section))
      .map((entry) => ({ label: entry.label, value: entry.value }));

  const overviewRows: StatRow[] = [
    { label: "Size", value: item.size },
    { label: "Weight", value: item.weight },
    { label: isWeapon ? "Skill" : "Item Type", value: isWeapon ? item.skill : item.itemTypeLabel }
  ];

  const primaryRows: StatRow[] = statRowsForSections("primary");
  const weaponRows: StatRow[] = isWeapon
    ? [
        { label: "Base Damage", value: item.damage, show: item.damage > 0 },
        { label: "Delay", value: item.delay, show: item.delay > 0 },
        { label: "Damage bonus", value: item.damageBonus, show: item.damageBonus > 0 },
        { label: "Range", value: item.range, show: item.range > 0 }
      ]
    : [];
  weaponRows.push(
    ...item.stats
      .filter(isTopDamageStat)
      .map((entry) => ({ label: entry.label, value: entry.value }))
  );
  const attributeRows: StatRow[] = statRowsForSections("attributes", "heroics");
  const resistRows: StatRow[] = statRowsForSections("resists");
  const modifierRows: StatRow[] = item.stats.filter(isModifierStat).map((entry) => ({ label: entry.label, value: entry.value }));
  const supportRows: StatRow[] = [
    ...item.stats
      .filter(
        (entry) =>
          (entry.section === "offense" || entry.section === "defense" || entry.section === "utility") &&
          !isModifierStat(entry) &&
          !isTopDamageStat(entry)
      )
      .map((entry) => ({ label: entry.label, value: entry.value })),
    { label: "Req Level", value: item.levelRequired, show: item.levelRequired > 0 },
    { label: "Rec Level", value: item.recommendedLevel, show: item.recommendedLevel > 0 }
  ];

  const topColumns: Array<{ key: string; rows: StatRow[] }> = [
    { key: "overview", rows: overviewRows },
    { key: "primary", rows: primaryRows },
    { key: "weapon", rows: weaponRows }
  ].filter((column) => hasVisibleRows(column.rows));

  const showSupportRowsInTop = !isWeapon && topColumns.length < 3 && hasVisibleRows(supportRows) && !hasVisibleRows(attributeRows) && !hasVisibleRows(resistRows);

  if (showSupportRowsInTop) {
    topColumns.push({ key: "support", rows: supportRows });
  }

  const lowerColumns: Array<{ key: string; rows: StatRow[] }> = [
    { key: "attributes", rows: attributeRows },
    { key: "resists", rows: resistRows },
    ...(showSupportRowsInTop ? [] : [{ key: "support", rows: supportRows }])
  ].filter((column) => hasVisibleRows(column.rows));

  const hasLowerColumns = lowerColumns.length > 0;
  const statGridColumnCount = Math.max(topColumns.length, lowerColumns.length, 1);
  const statGridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${statGridColumnCount}, max-content)`
  };

  return (
    <section
      className={`inline-block max-w-full rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(23,29,38,0.96),rgba(14,19,27,0.94))] px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.3)] backdrop-blur-sm sm:px-4 sm:py-3 ${className}`.trim()}
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
          <div className="grid justify-start gap-x-4 gap-y-2.5" style={statGridStyle}>
            {topColumns.map((column, index) => (
              <div
                key={column.key}
                className="min-w-max"
                style={{ gridColumn: index + 1, gridRow: 1 }}
              >
                <StatPairList rows={column.rows} alignValuesRight />
              </div>
            ))}
            {hasLowerColumns
              ? lowerColumns.map((column, index) => (
                <div
                  key={column.key}
                  className="min-w-max"
                  style={{ gridColumn: index + 1, gridRow: 2 }}
                >
                  <StatPairList rows={column.rows} alignValuesRight />
                </div>
              ))
              : null}
          </div>
        </div>

        {hasVisibleRows(modifierRows) ? (
          <div className="min-w-max">
            <StatPairList rows={modifierRows} />
          </div>
        ) : null}

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
          <EffectBlock title="Spell Scroll Effect" effect={item.spellScrollEffect} />
        </div>

        {hasCoinValue ? (
          <div className="flex flex-wrap items-center gap-2 text-[14px] leading-5">
            <span className="font-semibold text-[#d8ceb4]">Value:</span>
            <CoinDisplay value={item.coinValue} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
