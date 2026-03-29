import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getSpellDetail } from "@eq-alla/data";
import { ItemIcon } from "../../../components/item-icon";
import { PageHero, SectionCard } from "../../../components/catalog-shell";
import { SpellIcon } from "../../../components/spell-icon";

type SpellDetailPageProps = {
  params: Promise<{ id: string }>;
};

function DetailRows({
  rows
}: {
  rows: Array<{ label: string; value: ReactNode; show?: boolean }>;
}) {
  return (
    <div className="space-y-px rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.94),rgba(10,14,21,0.92))] p-4 shadow-[0_14px_30px_rgba(0,0,0,0.22)]">
      {rows
        .filter((row) => row.show !== false)
        .map((row) => (
          <div key={row.label} className="grid grid-cols-[150px_minmax(0,1fr)] gap-3 py-2 text-[15px] leading-6">
            <div className="font-semibold text-[#d8ceb4]">{row.label}</div>
            <div className="min-w-0 text-[#e6e0d2]">{row.value}</div>
          </div>
        ))}
    </div>
  );
}

function BulletList({
  items
}: {
  items: ReactNode[];
}) {
  return (
    <ul className="list-disc space-y-2 pl-6 text-[15px] leading-6 text-[#e6e0d2] marker:text-[#c5a869]">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export default async function SpellDetailPage({ params }: SpellDetailPageProps) {
  const { id } = await params;
  const spell = await getSpellDetail(Number(id));

  if (!spell) notFound();

  const classDisplay =
    spell.classLevels.length > 0 ? spell.classLevels.map((entry) => `${entry.className} (${entry.level})`).join(", ") : "NPC only";
  const resistDisplay = spell.resistAdjust !== 0 ? `${spell.resist} (adjust: ${spell.resistAdjust})` : spell.resist;

  return (
    <>
      <PageHero
        eyebrow="Spell Detail"
        title={`Spell: ${spell.name}`}
        description={spell.description}
        badges={[
          spell.skill,
          spell.target,
          `Mana ${spell.mana}`,
          spell.classLevels[0] ? `Min level ${spell.classLevels[0].level}` : "NPC only"
        ]}
        actions={<SpellIcon icon={spell.icon} name={spell.name} size="md" />}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <SectionCard title="Info">
          <DetailRows
            rows={[
              { label: "Spell ID", value: spell.id },
              { label: "Classes", value: classDisplay },
              { label: "Mana", value: spell.mana },
              { label: "Skill", value: spell.skill },
              { label: "Casting time", value: spell.castTime },
              { label: "Recovery time", value: spell.recoveryTime },
              { label: "Recast time", value: spell.recastTime },
              { label: "Range", value: spell.range },
              { label: "Target", value: spell.target },
              { label: "AoE Range", value: spell.aoeRange, show: spell.aoeRange > 1 },
              { label: "AoE Max Targets", value: spell.aoeMaxTargets, show: spell.aoeMaxTargets > 1 },
              { label: "AoE Duration", value: spell.aoeDuration, show: spell.aoeDuration !== "Instant" },
              { label: "Resist", value: resistDisplay },
              { label: "Interruptible", value: spell.interruptible ? "Yes" : "No" },
              { label: "Hate Generated", value: spell.hateGenerated, show: spell.hateGenerated !== 0 },
              { label: "Duration", value: spell.duration }
            ]}
          />
        </SectionCard>

        <div className="grid gap-4">
          <SectionCard title="Spell Messages">
            {spell.messages.length > 0 ? (
              <BulletList
                items={spell.messages.map((entry) => (
                  <span key={entry.label}>
                    <span className="font-semibold text-[#d8ceb4]">{entry.label}: </span>
                    {entry.text}
                  </span>
                ))}
              />
            ) : (
              <p className="text-[15px] leading-6 text-[#aeb8ca]">No cast or fade messages are set for this spell.</p>
            )}
          </SectionCard>

          <SectionCard title="Reagents">
            {spell.reagents.length > 0 ? (
              <BulletList
                items={spell.reagents.map((entry) => (
                  <span key={entry.id}>
                    <Link href={entry.href} className="text-[#7ab8ff] underline decoration-[1.5px] underline-offset-2 hover:text-[#a7d2ff]">
                      {entry.name}
                    </Link>{" "}
                    ({entry.count})
                  </span>
                ))}
              />
            ) : (
              <p className="text-[15px] leading-6 text-[#aeb8ca]">This spell does not require reagents.</p>
            )}
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Spell Effects">
        {spell.effects.length > 0 ? (
          <BulletList items={spell.effects.map((entry) => <span key={entry.slot}>{entry.slot}: {entry.text}</span>)} />
        ) : (
          <p className="text-[15px] leading-6 text-[#aeb8ca]">No effect slots are available for this spell.</p>
        )}
      </SectionCard>

      <SectionCard title="Items With Spell">
        {spell.itemSources.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {spell.itemSources.map((entry) => (
              <Link
                key={entry.id}
                href={entry.href}
                className="group flex items-center gap-3 rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.94),rgba(10,14,21,0.92))] px-3 py-3 transition hover:border-[#c5a869]/45 hover:bg-[linear-gradient(180deg,rgba(35,42,53,0.96),rgba(16,20,28,0.92))]"
              >
                <ItemIcon icon={entry.icon} name={entry.name} size="sm" />
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
