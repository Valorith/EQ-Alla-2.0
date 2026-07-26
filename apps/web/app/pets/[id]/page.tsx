import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "../../../components/breadcrumbs";
import { loadPetDetail } from "../../../components/detail-loaders";
import { buildNotFoundMetadata, buildPageMetadata, joinDescriptionParts } from "../../../components/page-metadata";
import { DefinitionGrid, PageHero, SectionCard } from "../../../components/catalog-shell";

type PetDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PetDetailPageProps) {
  const { id } = await params;
  const pet = await loadPetDetail(Number(id));

  if (!pet) {
    return buildNotFoundMetadata("Pet");
  }

  return buildPageMetadata({
    title: pet.name,
    description:
      joinDescriptionParts([pet.notes, `${pet.ownerClass} pet`, pet.levelRange ? `levels ${pet.levelRange}` : null]) ||
      `Summoning spell and stats for ${pet.name}.`,
    path: `/pets/${pet.id}`
  });
}

export default async function PetDetailPage({ params }: PetDetailPageProps) {
  const { id } = await params;
  const pet = await loadPetDetail(Number(id));

  if (!pet) notFound();

  return (
    <>
      <Breadcrumbs entries={[{ label: "Pets", href: "/pets" }, { label: pet.name }]} />
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
