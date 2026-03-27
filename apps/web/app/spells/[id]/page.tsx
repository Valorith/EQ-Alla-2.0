import { notFound } from "next/navigation";
import { getSpellDetail } from "@eq-alla/data";
import { DefinitionGrid, PageHero, SectionCard } from "../../../components/catalog";

type SpellDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SpellDetailPage({ params }: SpellDetailPageProps) {
  const { id } = await params;
  const spell = await getSpellDetail(Number(id));

  if (!spell) notFound();

  return (
    <>
      <PageHero
        eyebrow="Spell Detail"
        title={spell.name}
        description={spell.description}
        badges={[spell.skill, `Mana ${spell.mana}`, spell.resist]}
      />
      <SectionCard title="Overview">
        <DefinitionGrid
          items={[
            { label: "Classes", value: spell.classes.join(", ") },
            { label: "Level", value: spell.level },
            { label: "Target", value: spell.target },
            { label: "Duration", value: spell.duration },
            { label: "Effect", value: spell.effect }
          ]}
        />
      </SectionCard>
    </>
  );
}
