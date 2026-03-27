import { notFound } from "next/navigation";
import { getRecipeDetail } from "@eq-alla/data";
import { DefinitionGrid, LinkList, PageHero, SectionCard } from "../../../components/catalog";

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = await params;
  const recipe = getRecipeDetail(Number(id));

  if (!recipe) notFound();

  return (
    <>
      <PageHero
        eyebrow="Recipe Detail"
        title={recipe.name}
        description={recipe.notes}
        badges={[recipe.tradeskill, `Trivial ${recipe.trivial}`, recipe.container]}
      />
      <SectionCard title="Overview">
        <DefinitionGrid
          items={[
            { label: "Tradeskill", value: recipe.tradeskill },
            { label: "Trivial", value: recipe.trivial },
            { label: "Container", value: recipe.container },
            { label: "Result", value: recipe.result }
          ]}
        />
      </SectionCard>
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Creates">
          <LinkList items={recipe.creates.map((entry) => ({ href: entry.href, label: `${entry.name} x${entry.count}` }))} />
        </SectionCard>
        <SectionCard title="Ingredients">
          <LinkList items={recipe.ingredients.map((entry) => ({ href: entry.href, label: `${entry.name} x${entry.count}` }))} />
        </SectionCard>
      </div>
    </>
  );
}
