import { PageHero } from "../../components/catalog-shell";
import { PetSearchClient } from "./pet-search-client";

type PetsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PetsPage({ searchParams }: PetsPageProps) {
  const params = await searchParams;
  const className = typeof params.class === "string" ? params.class : "";

  return (
    <>
      <PageHero eyebrow="Pets" title="Pet Search" description="A compact pet browser aligned to the legacy pet section." />
      <PetSearchClient initialClassName={className} />
    </>
  );
}
