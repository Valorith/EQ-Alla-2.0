import Link from "next/link";
import { listPets } from "@eq-alla/data";
import { Input } from "@eq-alla/ui";
import { PageHero, SearchPrompt, SectionCard, SimpleTable } from "../../components/catalog-shell";

type PetsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PetsPage({ searchParams }: PetsPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const hasQuery = q.trim().length > 0;
  const pets = hasQuery ? listPets(q) : [];

  return (
    <>
      <PageHero eyebrow="Pets" title="Pet Search" description="A compact pet browser aligned to the legacy pet section." />
      <SectionCard title="Filter">
        <form action="/pets" className="flex gap-3">
          <Input name="q" defaultValue={q} placeholder="Spirit Wolf..." />
          <button className="h-11 rounded-full bg-[var(--accent)] px-5 text-sm font-medium text-[var(--accent-foreground)]">
            Search
          </button>
        </form>
      </SectionCard>
      <SectionCard title={hasQuery ? `${pets.length} pets` : "Results"}>
        {hasQuery ? (
          <SimpleTable
            columns={["Name", "Owner class", "Levels", "Granted by"]}
            rows={pets.map((pet) => [
              <Link key={pet.id} href={`/pets/${pet.id}`} className="font-medium hover:underline">
                {pet.name}
              </Link>,
              pet.ownerClass,
              pet.levelRange,
              pet.grantedBy.name
            ])}
          />
        ) : (
          <SearchPrompt message="Enter a pet name to load results." />
        )}
      </SectionCard>
    </>
  );
}
