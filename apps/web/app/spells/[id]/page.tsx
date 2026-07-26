import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { type SpellEffect } from "@eq-alla/data";
import { Badge, Card, CardContent, entityLinkClass } from "@eq-alla/ui";
import { Breadcrumbs } from "../../../components/breadcrumbs";
import { loadSpellDetail } from "../../../components/detail-loaders";
import { buildNotFoundMetadata, buildPageMetadata, joinDescriptionParts } from "../../../components/page-metadata";
import { ItemIcon } from "../../../components/item-icon";
import { SectionCard } from "../../../components/catalog-shell";
import { SpellIcon } from "../../../components/spell-icon";

type SpellDetailPageProps = {
  params: Promise<{ id: string }>;
};

type Tone = "fire" | "cold" | "poison" | "disease" | "magic" | "neutral";

function getResistTone(resist: string): Tone {
  const key = resist.toLowerCase();
  if (key.includes("fire")) return "fire";
  if (key.includes("cold") || key.includes("ice")) return "cold";
  if (key.includes("poison")) return "poison";
  if (key.includes("disease")) return "disease";
  if (key.includes("magic")) return "magic";
  return "neutral";
}

const toneStyles: Record<Tone, { dot: string; text: string }> = {
  fire: { dot: "bg-[#f59b72]", text: "text-[#f5b193]" },
  cold: { dot: "bg-[#7ec3f5]", text: "text-[#a5d4f8]" },
  poison: { dot: "bg-[#7ddc8f]", text: "text-[#a3e8b1]" },
  disease: { dot: "bg-[#c9e37e]", text: "text-[#dcea9f]" },
  magic: { dot: "bg-[#c9a0f5]", text: "text-[#d7bdf8]" },
  neutral: { dot: "bg-[#d7a45f]", text: "text-[#eccf9e]" }
};

function getEffectTone(text: string): "detrimental" | "beneficial" | "neutral" {
  if (/^(decrease|drain|reduce|damage|lower)/i.test(text)) return "detrimental";
  if (/^(increase|restore|heal|raise)/i.test(text)) return "beneficial";
  return "neutral";
}

const effectBadgeStyles = {
  detrimental: "border-[#e58a7a]/35 bg-[#e58a7a]/10 text-[#f0a496]",
  beneficial: "border-[#7ddc8f]/35 bg-[#7ddc8f]/10 text-[#a3e8b1]",
  neutral: "border-[#d7a45f]/30 bg-[#d7a45f]/10 text-[#eccf9e]"
} as const;

function StatTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(23,29,38,0.9),rgba(13,17,24,0.88))] px-4 py-3 shadow-[0_14px_30px_rgba(0,0,0,0.22)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a89a83]">{label}</p>
      <p className="mt-1.5 text-lg font-semibold leading-snug tracking-[-0.02em] text-[#f2ead9]">{value}</p>
    </div>
  );
}

function DefItem({ label, children, show = true }: { label: string; children: ReactNode; show?: boolean }) {
  if (!show) {
    return null;
  }

  return (
    <div className="rounded-xl border border-white/8 bg-black/20 px-3.5 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a89a83]">{label}</p>
      <div className="mt-1 text-[15px] font-medium leading-6 text-[#e8dfcf]">{children}</div>
    </div>
  );
}

function ClassLevelChips({ classLevels }: { classLevels: Array<{ className: string; level: number }> }) {
  if (classLevels.length === 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/5 px-3 py-1.5 text-sm font-medium text-[#c9bdaa]">
        NPC only
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {classLevels.map((entry) => (
        <span
          key={`${entry.className}-${entry.level}`}
          className="inline-flex items-center gap-2 rounded-full border border-[#d7a45f]/25 bg-[#d7a45f]/8 py-1 pl-3 pr-1.5 text-sm font-medium text-[#ecdfc8]"
        >
          {entry.className}
          <span className="rounded-full bg-[#d7a45f]/16 px-1.5 py-0.5 text-[11px] font-semibold tracking-[0.06em] text-[#f0c98a]">
            Lvl {entry.level}
          </span>
        </span>
      ))}
    </div>
  );
}

function renderSpellEffect(entry: SpellEffect) {
  if (!entry.link) {
    return entry.text;
  }

  const labelIndex = entry.text.indexOf(entry.link.label);
  if (labelIndex === -1) {
    return entry.text;
  }

  const leadingText = entry.text.slice(0, labelIndex);
  const trailingText = entry.text.slice(labelIndex + entry.link.label.length);

  return (
    <>
      {leadingText}
      <Link
        href={entry.link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={entityLinkClass}
      >
        {entry.link.label}
      </Link>
      {trailingText}
    </>
  );
}

export async function generateMetadata({ params }: SpellDetailPageProps) {
  const { id } = await params;
  const spell = await loadSpellDetail(Number(id));

  if (!spell) {
    return buildNotFoundMetadata("Spell");
  }

  const classSummary = spell.classLevels.map((entry) => `${entry.className} ${entry.level}`).join(", ");

  return buildPageMetadata({
    title: spell.name,
    description:
      joinDescriptionParts([
        spell.description,
        classSummary || "NPC-only spell",
        spell.resist ? `${spell.resist} resist` : null
      ]) || `Effects, components, and casting details for ${spell.name}.`,
    path: `/spells/${spell.id}`
  });
}

export default async function SpellDetailPage({ params }: SpellDetailPageProps) {
  const { id } = await params;
  const spell = await loadSpellDetail(Number(id));

  if (!spell) notFound();

  const isNpcOnly = spell.classLevels.length === 0;
  const resistTone = toneStyles[getResistTone(spell.resist)];
  const minLevel = spell.classLevels[0]?.level;

  return (
    <>
      <Breadcrumbs entries={[{ label: "Spells", href: "/spells" }, { label: spell.name }]} />
      <Card className="overflow-hidden border-white/10 bg-transparent">
        <CardContent className="eq-hero-surface relative overflow-hidden border border-white/10">
          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative shrink-0 self-start sm:self-center">
              <div aria-hidden="true" className="absolute -inset-2 rounded-[26px] border border-[#d7a45f]/25" />
              <SpellIcon icon={spell.icon} name={spell.name} size="lg" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#dcb46e]">Spell Detail</p>
              <div className="space-y-2">
                <h2 className="font-[var(--font-display)] text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                  {spell.name}
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{spell.description}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {[spell.skill, spell.target, `Mana ${spell.mana}`, minLevel ? `Min level ${minLevel}` : "NPC only"].map((badge) => (
                  <Badge key={badge} className="border-white/12 bg-white/8 text-slate-100">
                    {badge}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Mana" value={spell.mana} />
        <StatTile label="Casting time" value={spell.castTime} />
        <StatTile label="Recovery" value={spell.recoveryTime} />
        <StatTile label="Recast" value={spell.recastTime} />
        <StatTile label="Range" value={spell.range} />
        <StatTile label="Duration" value={spell.duration} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <SectionCard title="Details">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a89a83]">Classes</p>
              <div className="mt-2">
                <ClassLevelChips classLevels={spell.classLevels} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
              <DefItem label="Skill">{spell.skill}</DefItem>
              <DefItem label="Target">{spell.target}</DefItem>
              <DefItem label="Resist">
                <span className={`inline-flex items-center gap-2 ${resistTone.text}`}>
                  <span aria-hidden="true" className={`size-2 rounded-full ${resistTone.dot}`} />
                  {spell.resist}
                </span>
              </DefItem>
              <DefItem label="Resist adjust" show={spell.resistAdjust !== 0}>
                <span className={spell.resistAdjust < 0 ? "text-[#f0a496]" : "text-[#a3e8b1]"}>
                  {spell.resistAdjust > 0 ? `+${spell.resistAdjust}` : spell.resistAdjust}
                </span>
              </DefItem>
              <DefItem label="Interruptible">{spell.interruptible ? "Yes" : "No"}</DefItem>
              <DefItem label="Hate generated" show={spell.hateGenerated !== 0}>{spell.hateGenerated}</DefItem>
              <DefItem label="AoE range" show={spell.aoeRange > 1}>{spell.aoeRange}</DefItem>
              <DefItem label="AoE max targets" show={spell.aoeMaxTargets > 1}>{spell.aoeMaxTargets}</DefItem>
              <DefItem label="AoE duration" show={spell.aoeDuration !== "Instant"}>{spell.aoeDuration}</DefItem>
              <DefItem label="Spell ID">{spell.id}</DefItem>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-4">
          <SectionCard title="Spell Messages">
            {spell.messages.length > 0 ? (
              <div className="grid gap-2">
                {spell.messages.map((entry) => (
                  <div key={entry.label} className="rounded-xl border border-white/8 bg-black/20 px-3.5 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ccb594]">{entry.label}</p>
                    <p className="mt-1 text-[15px] leading-6 text-[#e6e0d2]">{entry.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[15px] leading-6 text-[#aeb8ca]">No cast or fade messages are set for this spell.</p>
            )}
          </SectionCard>

          <SectionCard title="Reagents">
            {spell.reagents.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {spell.reagents.map((entry) => (
                  <Link
                    key={entry.id}
                    href={entry.href}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 py-1 pl-3 pr-1.5 text-sm font-medium text-[#e8dfcf] transition hover:border-[#d7a45f]/45 hover:bg-[#d7a45f]/10 hover:text-white"
                  >
                    {entry.name}
                    <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[11px] font-semibold tracking-[0.06em] text-[#ccb594]">
                      ×{entry.count}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[15px] leading-6 text-[#aeb8ca]">This spell does not require reagents.</p>
            )}
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Spell Effects">
        {spell.effects.length > 0 ? (
          <div className="grid gap-2">
            {spell.effects.map((entry) => {
              const tone = getEffectTone(entry.text);

              return (
                <div
                  key={`${entry.text}:${entry.slots.join(",")}`}
                  className="flex items-start gap-3 rounded-[12px] border border-white/8 bg-[linear-gradient(180deg,rgba(19,23,31,0.94),rgba(10,14,21,0.92))] px-4 py-3"
                >
                  <span
                    className={`mt-0.5 inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${effectBadgeStyles[tone]}`}
                  >
                    {entry.slots.length > 0 ? `Slot ${entry.slots.join(" · ")}` : "Effect"}
                  </span>
                  <span className="min-w-0 text-[15px] leading-6 text-[#e6e0d2]">{renderSpellEffect(entry)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[15px] leading-6 text-[#aeb8ca]">No effect slots are available for this spell.</p>
        )}
      </SectionCard>

      <SectionCard title="Items With This Spell">
        {spell.itemSources.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {spell.itemSources.map((entry) => (
              <Link
                key={entry.id}
                href={entry.href}
                className="group flex items-center gap-3 rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.94),rgba(10,14,21,0.92))] px-3 py-3 transition hover:border-[#c5a869]/45 hover:bg-[linear-gradient(180deg,rgba(35,42,53,0.96),rgba(16,20,28,0.92))]"
              >
                <ItemIcon icon={entry.icon} name={entry.name} size="sm" tooltipItemId={entry.id} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-[#e6e0d2] transition group-hover:text-white">{entry.name}</p>
                  <p className="text-[12px] uppercase tracking-[0.18em] text-[#9f8e79]">Item {entry.id}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[15px] leading-6 text-[#aeb8ca]">No items currently reference this spell as a scroll effect.</p>
        )}
      </SectionCard>
    </>
  );
}
