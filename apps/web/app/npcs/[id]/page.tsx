import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getNpcDetail } from "@eq-alla/data";
import { ItemIcon } from "../../../components/item-icon";
import { PageHero, SectionCard } from "../../../components/catalog-shell";
import { NpcDropsSection } from "../../../components/npc-drops-section";
import { NpcModelPreview } from "../../../components/npc-model-preview";
import { SpellIcon } from "../../../components/spell-icon";

type NpcDetailPageProps = {
  params: Promise<{ id: string }>;
};

function OverviewDetails({
  items
}: {
  items: Array<{ label: string; value: ReactNode; show?: boolean }>;
}) {
  return (
    <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
      {items
        .filter((item) => item.show !== false)
        .map((item) => (
          <div key={item.label} className="border-b border-white/8 pb-4">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f8e79]">{item.label}</dt>
            <dd className="mt-2 text-[1.05rem] font-semibold leading-7 text-[#f1eadc]">{item.value}</dd>
          </div>
        ))}
    </dl>
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
  const useAiNpcModels = process.env.NPC_MODEL_ASSET_SET === "ai";
  const npcModelFallbackAssetBaseUrls = useAiNpcModels
    ? ["/assets/npc-models", "https://cdn.jsdelivr.net/gh/EQEmuTools/eq-asset-preview@master/assets/npc_models"]
    : ["https://cdn.jsdelivr.net/gh/EQEmuTools/eq-asset-preview@master/assets/npc_models"];

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
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b99a67]">Identity</p>
              <div className="mt-4">
                <OverviewDetails
                  items={[
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
                    }
                  ]}
                />
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b99a67]">Combat Profile</p>
              <div className="mt-4 rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,20,28,0.86),rgba(10,13,20,0.9))] px-4 py-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    { label: "Health points", value: npc.hp.toLocaleString() },
                    { label: "Mana", value: npc.mana.toLocaleString(), show: npc.mana > 0 },
                    { label: "Damage", value: npc.damage.replace(" - ", " to ") },
                    { label: "Attack delay", value: npc.attackDelay, show: npc.attackDelay > 0 }
                  ]
                    .filter((item) => item.show !== false)
                    .map((item, index) => (
                      <div
                        key={item.label}
                        className={index === 0 ? "" : "border-t border-white/8 pt-4 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0"}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f8e79]">{item.label}</p>
                        <p className="mt-2 text-[1.9rem] font-semibold tracking-[-0.04em] text-[#f1eadc]">{item.value}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {npc.specialAttacks.length > 0 ? (
              <div className="border-t border-white/10 pt-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-[220px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b99a67]">Special Attacks</p>
                    <p className="mt-2 text-sm leading-6 text-[#aeb8ca]">Encounter flags and combat immunities shown at a glance.</p>
                  </div>
                  <ul className="grid gap-x-6 gap-y-3 border-l border-white/10 pl-5 sm:grid-cols-2 xl:grid-cols-3 lg:max-w-[70%] lg:flex-1">
                    {npc.specialAttacks.map((attack) => (
                      <li key={attack} className="flex items-start gap-2 text-[15px] font-medium leading-6 text-[#ede4d3]">
                        <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a869]" />
                        <span>{attack}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <div className="grid gap-4">
          <NpcModelPreview
            appearance={npc.appearance}
            npcName={npc.name}
            assetBaseUrl={useAiNpcModels ? "/assets/npc-models-ai" : "/assets/npc-models"}
            fallbackAssetBaseUrls={npcModelFallbackAssetBaseUrls}
          />

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
                    <ItemIcon icon={entry.icon} name={entry.name} size="sm" tooltipItemId={entry.id} />
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

      <NpcDropsSection drops={npc.drops} />

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
