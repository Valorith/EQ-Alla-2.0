import { PageHero } from "../../components/catalog-shell";
import { RecipeSearchClient } from "./recipe-search-client";
import { buildPageMetadata } from "../../components/page-metadata";

type RecipesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = buildPageMetadata({
  title: "Recipe Search",
  description:
    "Search tradeskill recipes by name, skill, and trivial, with ingredients, results, containers, and the zones that hold each station.",
  path: "/recipes"
});

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const tradeskill = typeof params.tradeskill === "string" ? params.tradeskill : "";
  const minTrivial = typeof params.minTrivial === "string" ? params.minTrivial : "";
  const maxTrivial = typeof params.maxTrivial === "string" ? params.maxTrivial : "";

  return (
    <>
      <PageHero eyebrow="Tradeskills" title="Recipe Search" description="Search tradeskill combines by name, skill, and trivial, then open a recipe for its ingredients, results, and station zones." />
      <RecipeSearchClient initialQuery={q} initialTradeskill={tradeskill} initialMinTrivial={minTrivial} initialMaxTrivial={maxTrivial} />
    </>
  );
}
