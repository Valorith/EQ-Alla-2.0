import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getNpcDetail } from "@eq-alla/data";
import { ItemIcon } from "../../../components/item-icon";
import { PageHero, SectionCard } from "../../../components/catalog-shell";
import { SpellIcon } from "../../../components/spell-icon";

type NpcDetailPageProps = {
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

export default async function NpcDetailPage({ params }: NpcDetailPageProps) {
  const { id } = await params;
  const npc = await getNpcDetail(Number(id));

  if (!npc) notFound();

  return (
    <>
      <PageHero
        eyebrow="NPC Detail"
        title={npc.name}
        description={`${npc.race} ${npc.klass} in ${npc.zone}`}
        badges={[`Level ${npc.level}`, npc.named ? "Named" : "Common", npc.faction]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <SectionCard title="Overview">
          <DetailRows
            rows={[
              { label: "Full name", value: npc.fullName },
              { label: "Level", value: npc.level },
              { label: "Race", value: npc.race },
              { label: "Class", value: npc.klass },
              {
                label: "Main faction",
                value: npc.mainFaction ? (
                  <Link href={npc.mainFaction.href} className="text-[#7ab8ff] underline decoration-[1.5px] underline-offset-2 hover:text-[#a7d2ff]">
                    {npc.mainFaction.name}
                  </Link>
                ) : (
                  npc.faction
                )
              },
              { label: "Health points", value: npc.hp.toLocaleString() },
              { label: "Mana", value: npc.mana.toLocaleString(), show: npc.mana > 0 },
              { label: "Damage", value: npc.damage.replace(" - ", " to ") },
              { label: "Attack speed", value: npc.attackSpeed, show: npc.attackSpeed !== "Normal (100%)" },
              { label: "Special attacks", value: npc.specialAttacks.join(", "), show: npc.specialAttacks.length > 0 }
            ]}
          />
        </SectionCard>

        <div className="grid gap-4">
          <SectionCard title="This NPC Casts">
            {npc.spells.length > 0 ? (
              <div className="space-y-3">
                {npc.spells.map((entry) => (
                  <Link
                    key={entry.id}
                    href={entry.href}
                    className="group flex items-center gap-3 rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.94),rgba(10,14,21,0.92))] px-3 py-3 transition hover:border-[#c5a869]/45 hover:bg-[linear-gradient(180deg,rgba(35,42,53,0.96),rgba(16,20,28,0.92))]"
                  >
                    <SpellIcon icon={entry.icon} name={entry.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[#e6e0d2] transition group-hover:text-white">{entry.name}</p>
                      <p className="text-[12px] uppercase tracking-[0.18em] text-[#9f8e79]">{entry.type}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[15px] leading-6 text-[#aeb8ca]">No spell list is configured for this NPC.</p>
            )}
          </SectionCard>

          {npc.sells.length > 0 ? (
            <SectionCard title="This NPC Sells">
              <div className="space-y-3">
                {npc.sells.map((entry) => (
                  <Link
                    key={entry.id}
                    href={entry.href}
                    className="group flex items-center gap-3 rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.94),rgba(10,14,21,0.92))] px-3 py-3 transition hover:border-[#c5a869]/45 hover:bg-[linear-gradient(180deg,rgba(35,42,53,0.96),rgba(16,20,28,0.92))]"
                  >
                    <ItemIcon icon={entry.icon} name={entry.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[#e6e0d2] transition group-hover:text-white">{entry.name}</p>
                      <p className="text-[12px] uppercase tracking-[0.18em] text-[#9f8e79]">{entry.price}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>

      <SectionCard title="When Killed, This NPC Drops">
        {npc.drops.length > 0 ? (
          <div className="space-y-5">
            {npc.drops.map((group) => (
              <div key={group.lootdropId} className="space-y-3">
                <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#c5a869]">
                  With a probability of {group.probability}% (multiplier: {group.multiplier})
                </p>
                <div className="space-y-3">
                  {group.items.map((entry) => (
                    <Link
                      key={`${group.lootdropId}-${entry.id}`}
                      href={entry.href}
                      className="group flex items-center gap-3 rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.94),rgba(10,14,21,0.92))] px-3 py-3 transition hover:border-[#c5a869]/45 hover:bg-[linear-gradient(180deg,rgba(35,42,53,0.96),rgba(16,20,28,0.92))]"
                    >
                      <ItemIcon icon={entry.icon} name={entry.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-[#e6e0d2] transition group-hover:text-white">{entry.name}</p>
                        <p className="text-[12px] uppercase tracking-[0.18em] text-[#9f8e79]">
                          {entry.type} • {entry.chance}% ({entry.globalChance}% global)
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[15px] leading-6 text-[#aeb8ca]">No loot entries were found for this NPC.</p>
        )}
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="This NPC Spawns In">
          {npc.spawnZones.length > 0 ? (
            <BulletList
              items={npc.spawnZones.map((entry) => (
                <Link
                  key={entry.shortName}
                  href={entry.href}
                  className="text-[#7ab8ff] underline decoration-[1.5px] underline-offset-2 hover:text-[#a7d2ff]"
                >
                  {entry.longName}
                </Link>
              ))}
            />
          ) : (
            <p className="text-[15px] leading-6 text-[#aeb8ca]">No spawn zones were found for this NPC.</p>
          )}
        </SectionCard>

        <SectionCard title="Killing This NPC Lowers Factions">
          {npc.factionHits.lowers.length > 0 ? (
            <BulletList
              items={npc.factionHits.lowers.map((entry) => (
                <span key={entry.id}>
                  <Link href={entry.href} className="text-[#7ab8ff] underline decoration-[1.5px] underline-offset-2 hover:text-[#a7d2ff]">
                    {entry.name}
                  </Link>{" "}
                  ({entry.value})
                </span>
              ))}
            />
          ) : (
            <p className="text-[15px] leading-6 text-[#aeb8ca]">No negative faction hits are configured.</p>
          )}
        </SectionCard>

        <SectionCard title="Killing This NPC Raises Factions">
          {npc.factionHits.raises.length > 0 ? (
            <BulletList
              items={npc.factionHits.raises.map((entry) => (
                <span key={entry.id}>
                  <Link href={entry.href} className="text-[#7ab8ff] underline decoration-[1.5px] underline-offset-2 hover:text-[#a7d2ff]">
                    {entry.name}
                  </Link>{" "}
                  ({entry.value})
                </span>
              ))}
            />
          ) : (
            <p className="text-[15px] leading-6 text-[#aeb8ca]">No positive faction hits are configured.</p>
          )}
        </SectionCard>
      </div>
    </>
  );
}
