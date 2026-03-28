import Link from "next/link";
import { notFound } from "next/navigation";
import { getPetDetail } from "@eq-alla/data";
import { DefinitionGrid, PageHero, SectionCard } from "../../../components/catalog-shell";

type PetDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PetDetailPage({ params }: PetDetailPageProps) {
  const { id } = await params;
  const pet = await getPetDetail(Number(id));

  if (!pet) notFound();

  return (
    <>
      <PageHero eyebrow="Pet Detail" title={pet.name} description={pet.notes} badges={[pet.ownerClass, pet.levelRange]} />
      <SectionCard title="Overview">
        <DefinitionGrid
          items={[
            { label: "Owner class", value: pet.ownerClass },
            { label: "Level range", value: pet.levelRange },
            {
              label: "Granted by",
              value: (
                <Link href={pet.grantedBy.href} className="hover:underline">
                  {pet.grantedBy.name}
                </Link>
              )
            }
          ]}
        />
      </SectionCard>
    </>
  );
}
