import { PageHero } from "../../components/catalog-shell";
import { PetSearchClient } from "./pet-search-client";

type PetsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PetsPage({ searchParams }: PetsPageProps) {
  const params = await searchParams;
  const classesParam = typeof params.classes === "string" ? params.classes : "";
  const legacyClassName = typeof params.class === "string" ? params.class : "";
  const initialClasses = classesParam
    ? classesParam.split(",").map((entry) => entry.trim()).filter(Boolean)
    : legacyClassName
      ? [legacyClassName]
      : [];

  return (
    <>
      <PageHero eyebrow="Pets" title="Pet Search" description="Browse summoned pets by owner class, then drill into spell and stat details." />
      <PetSearchClient initialClasses={initialClasses} />
    </>
  );
}
