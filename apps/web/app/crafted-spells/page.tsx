import Link from "next/link";
import { getCraftedSpellCatalog } from "@eq-alla/data";
import { Button } from "@eq-alla/ui";
import { PageHero } from "../../components/catalog-shell";
import { CraftedSpellsViewer } from "./crafted-spells-viewer";

type CraftedSpellsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CraftedSpellsPage({ searchParams }: CraftedSpellsPageProps) {
  const params = await searchParams;
  const initialQuery = typeof params.q === "string" ? params.q : "";
  const initialRecipeKey = typeof params.recipe === "string" ? Number(params.recipe) : Number.NaN;
  const catalog = await getCraftedSpellCatalog();

  return (
    <div className="eq-crafted-spells-scope space-y-6">
      <PageHero
        eyebrow="Clumsy's Home"
        title="Crafted Spells"
        description="Browse Victoria's spell and tome combines by class, level band, and catalyst type. This viewer parses the live quest script on a refresh interval so recipe changes flow in without hand-maintaining the page."
        badges={[
          `${catalog.summary.totalRecipes} recipes`,
          `${catalog.summary.totalClasses} classes`,
          `${catalog.summary.totalLevelBands} level bands`
        ]}
        actions={
          <div className="flex flex-wrap gap-3 xl:justify-end">
            <Button asChild>
              <Link href="/spells">Browse Spell Archive</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/recipes">Compare Tradeskill Recipes</Link>
            </Button>
          </div>
        }
      />

      <CraftedSpellsViewer
        catalog={catalog}
        initialQuery={initialQuery}
        initialRecipeKey={Number.isFinite(initialRecipeKey) ? initialRecipeKey : undefined}
      />
    </div>
  );
}
