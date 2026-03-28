import { PageHero } from "../../components/catalog-shell";
import { RecipeSearchClient } from "./recipe-search-client";

type RecipesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const tradeskill = typeof params.tradeskill === "string" ? params.tradeskill : "";
  const minTrivial = typeof params.minTrivial === "string" ? params.minTrivial : "";
  const maxTrivial = typeof params.maxTrivial === "string" ? params.maxTrivial : "";

  return (
    <>
      <PageHero eyebrow="Tradeskills" title="Recipe Search" description="Recipe indexing with room for live ingredient and result relationships." />
      <RecipeSearchClient initialQuery={q} initialTradeskill={tradeskill} initialMinTrivial={minTrivial} initialMaxTrivial={maxTrivial} />
    </>
  );
}
