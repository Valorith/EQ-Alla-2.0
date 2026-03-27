import Link from "next/link";
import { listRecipes } from "@eq-alla/data";
import { Input } from "@eq-alla/ui";
import { FilterForm, PageHero, SectionCard, SelectField, SimpleTable } from "../../components/catalog";

type RecipesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const tradeskill = typeof params.tradeskill === "string" ? params.tradeskill : "";
  const recipes = listRecipes({ q, tradeskill });

  return (
    <>
      <PageHero eyebrow="Tradeskills" title="Recipe Search" description="Recipe indexing with room for live ingredient and result relationships." />
      <SectionCard title="Filters">
        <FilterForm action="/recipes">
          <label className="grid gap-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Recipe</span>
            <Input name="q" defaultValue={q} placeholder="Traveler's Kit..." />
          </label>
          <SelectField label="Tradeskill" name="tradeskill" defaultValue={tradeskill} options={["Alchemy", "Smithing"]} />
        </FilterForm>
      </SectionCard>
      <SectionCard title={`${recipes.length} recipes`}>
        <SimpleTable
          columns={["Recipe", "Tradeskill", "Trivial", "Result"]}
          rows={recipes.map((recipe) => [
            <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="font-medium hover:underline">
              {recipe.name}
            </Link>,
            recipe.tradeskill,
            recipe.trivial,
            recipe.result
          ])}
        />
      </SectionCard>
    </>
  );
}
