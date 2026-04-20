import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getNpcDetail } from "@eq-alla/data";
import { PageHero, SectionCard } from "../../../components/catalog-shell";
import { NpcDropsSection } from "../../../components/npc-drops-section";
import { NpcModelPreview } from "../../../components/npc-model-preview";
import { NpcSellList } from "../../../components/npc-sell-list";
import { NpcSpellList } from "../../../components/npc-spell-list";

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
              <NpcSpellList spells={npc.spells} />
            ) : (
              <p className="text-[15px] leading-6 text-[#aeb8ca]">No spell list is configured for this NPC.</p>
            )}
          </SectionCard>

          {npc.sells.length > 0 ? (
            <SectionCard title="This NPC Sells">
              <NpcSellList items={npc.sells} />
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
