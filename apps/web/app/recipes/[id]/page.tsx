import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FlaskConical, Package2, Wrench } from "lucide-react";
import { getRecipeDetail } from "@eq-alla/data";
import { ItemIcon } from "../../../components/item-icon";

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

function MetaBand({
  items
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <dl className="grid gap-4 border-y border-white/10 py-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9f8e79]">{item.label}</dt>
          <dd className="text-lg font-semibold tracking-[-0.03em] text-[#f3ecdf]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RecipeEntryRow({
  entry,
  quantityLabel
}: {
  entry: { id: number; name: string; href: string; count: number; icon: string };
  quantityLabel: string;
}) {
  return (
    <Link
      href={entry.href}
      className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-white/8 py-3 first:border-t-0"
    >
      <ItemIcon icon={entry.icon} name={entry.name} size="sm" tooltipItemId={entry.id} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-[#ede4d3] transition group-hover:text-white">{entry.name}</p>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8d7f6b]">{quantityLabel}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-[#7e7364] transition group-hover:translate-x-0.5 group-hover:text-[#dbc083]" />
    </Link>
  );
}

function ContainerLink({
  entry
}: {
  entry: { id: number; name: string; href?: string; icon: string };
}) {
  const content = (
    <>
      {entry.icon ? <ItemIcon icon={entry.icon} name={entry.name} size="xs" tooltipItemId={entry.id} /> : null}
      <span className="truncate text-[var(--muted-strong)]">{entry.name}</span>
    </>
  );

  if (!entry.href) {
    return (
      <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] px-3 py-1.5 text-sm font-medium text-[var(--muted-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        {content}
      </span>
    );
  }

  return (
    <Link
      href={entry.href}
      className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] px-3 py-1.5 text-sm font-medium text-[var(--muted-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-[#c5a869]/42 hover:bg-[linear-gradient(180deg,rgba(220,180,110,0.18),rgba(255,255,255,0.06))] hover:text-white visited:text-[var(--muted-strong)]"
    >
      {content}
    </Link>
  );
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = await params;
  const recipe = await getRecipeDetail(Number(id));

  if (!recipe) notFound();

  const totalYield = recipe.creates.reduce((sum, entry) => sum + entry.count, 0);
  const containerCount = recipe.containers.length;
  const firstCreate = recipe.creates[0];

  return (
    <div className="eq-recipe-scope space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(26,21,18,0.9),rgba(10,13,18,0.95))] shadow-[0_28px_80px_rgba(0,0,0,0.34)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(220,180,110,0.14),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(91,124,171,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_28%)]" />

        <div className="relative z-10 space-y-8 px-5 py-6 sm:px-7 sm:py-7 xl:px-8 xl:py-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] xl:items-start">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#dcb46e]">Recipe Dossier</p>
                <div className="space-y-3">
                  <h1 className="max-w-4xl font-[var(--font-display)] text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl xl:text-[2.75rem]">
                    {recipe.name}
                  </h1>
                  <p className="max-w-3xl text-sm leading-7 text-[var(--foreground)]/88 sm:text-base">{recipe.notes}</p>
                </div>
              </div>

              <MetaBand
                items={[
                  { label: "Tradeskill", value: recipe.tradeskill },
                  { label: "Trivial", value: String(recipe.trivial) },
                  { label: "Total Yield", value: totalYield > 0 ? String(totalYield) : "Unknown" },
                  { label: "Containers", value: containerCount > 0 ? String(containerCount) : "Unknown" }
                ]}
              />

              <div className="flex flex-wrap gap-2">
                {recipe.containers.length > 0 ? recipe.containers.map((entry) => <ContainerLink key={`${entry.id}-${entry.name}`} entry={entry} />) : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(15,19,26,0.94),rgba(9,12,17,0.96))] px-5 py-5">
              <div className="flex items-start gap-4">
                <div className="rounded-[22px] border border-[#c5a869]/28 bg-[linear-gradient(180deg,rgba(220,180,110,0.16),rgba(220,180,110,0.05))] p-3">
                  <FlaskConical className="size-6 text-[#e1be79]" />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#b99a67]">Production Summary</p>
                  <p className="text-sm leading-7 text-[var(--foreground)]/84">
                    {recipe.ingredients.length} ingredient{recipe.ingredients.length === 1 ? "" : "s"} combine into {recipe.result}.
                  </p>
                </div>
              </div>

              {firstCreate ? (
                <div className="mt-6 flex items-center gap-4 border-t border-white/10 pt-5">
                  <ItemIcon icon={firstCreate.icon} name={firstCreate.name} size="lg" tooltipItemId={firstCreate.id} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Primary Output</p>
                    <Link
                      href={firstCreate.href}
                      className="mt-1 block truncate font-[var(--font-display)] text-[1.7rem] font-semibold tracking-[-0.04em]"
                    >
                      <span className="text-[#f4edde] transition group-hover:text-white">{firstCreate.name}</span>
                    </Link>
                    <p className="mt-1 text-sm text-[var(--foreground)]/82">Yield: {firstCreate.count}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 border-t border-white/10 pt-5 text-sm text-[var(--foreground)]/82">This recipe does not expose a resolved output item.</div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(13,17,24,0.92),rgba(8,11,16,0.96))]">
            <div className="grid gap-0 xl:grid-cols-[minmax(0,1.1fr)_120px_minmax(320px,0.9fr)]">
              <section className="px-5 py-5 sm:px-6 sm:py-6">
                <div className="flex items-center gap-3">
                  <Package2 className="size-5 text-[#dcb46e]" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b99a67]">Required Materials</p>
                    <p className="mt-1 text-sm text-[var(--foreground)]/78">Everything needed before the combine starts.</p>
                  </div>
                </div>

                <div className="mt-5">
                  {recipe.ingredients.length > 0 ? (
                    recipe.ingredients.map((entry) => (
                      <RecipeEntryRow key={`ingredient-${entry.id}-${entry.count}`} entry={entry} quantityLabel={`Need x${entry.count}`} />
                    ))
                  ) : (
                    <p className="py-3 text-sm leading-7 text-[var(--foreground)]/78">No ingredient rows were recorded for this recipe.</p>
                  )}
                </div>
              </section>

              <div className="border-y border-white/12 bg-[linear-gradient(180deg,rgba(220,180,110,0.06),rgba(255,255,255,0.015))] px-5 py-5 xl:border-x xl:border-y-0 xl:px-4 xl:py-6">
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <div className="rounded-full border border-[#c5a869]/32 bg-[#c5a869]/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#efd091]">
                    Combine
                  </div>
                  <ArrowRight className="size-5 text-[#e0bf7e] xl:size-6" />
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Workbench</p>
                    <p className="text-sm font-medium text-[var(--muted-strong)]">{recipe.container}</p>
                  </div>
                </div>
              </div>

              <section className="px-5 py-5 sm:px-6 sm:py-6">
                <div className="flex items-center gap-3">
                  <Wrench className="size-5 text-[#dcb46e]" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b99a67]">Crafted Output</p>
                    <p className="mt-1 text-sm text-[var(--foreground)]/78">Resolved result items and their final yields.</p>
                  </div>
                </div>

                <div className="mt-5">
                  {recipe.creates.length > 0 ? (
                    recipe.creates.map((entry) => (
                      <RecipeEntryRow key={`create-${entry.id}-${entry.count}`} entry={entry} quantityLabel={`Yield x${entry.count}`} />
                    ))
                  ) : (
                    <p className="py-3 text-sm leading-7 text-[var(--foreground)]/78">No output items were resolved for this recipe.</p>
                  )}
                </div>
              </section>
            </div>
          </div>

          <div className="grid gap-4 border-t border-white/12 pt-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b99a67]">Crafting Notes</p>
              <p className="max-w-3xl text-sm leading-7 text-[var(--foreground)]/84">
                Use the ingredients list as your prep checklist, confirm the valid container options, then verify the expected yield before committing expensive combines.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-[var(--foreground)] sm:grid-cols-3 lg:grid-cols-1">
              <div className="border-l border-white/12 pl-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Recipe ID</p>
                <p className="mt-1 font-semibold">{recipe.id}</p>
              </div>
              <div className="border-l border-white/12 pl-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Output Summary</p>
                <p className="mt-1 font-semibold">{recipe.result}</p>
              </div>
              <div className="border-l border-white/12 pl-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Container Access</p>
                <p className="mt-1 font-semibold">{recipe.container}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
