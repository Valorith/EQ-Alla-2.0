import { PageHero } from "../../components/catalog-shell";
import { ItemSearchClient } from "./item-search-client";

type ItemsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const className = typeof params.class === "string" ? params.class : "";
  const slot = typeof params.slot === "string" ? params.slot : "";
  const type = typeof params.type === "string" ? params.type : "";
  const tradeable = params.tradeable === "true" ? true : params.tradeable === "false" ? false : undefined;
  const frameClassName =
    "border-[#7b603b]/20 bg-[linear-gradient(180deg,rgba(38,32,28,0.82),rgba(18,20,25,0.8))] shadow-[0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur-md";

  return (
    <div className="eq-item-search-scope space-y-6">
      <PageHero
        eyebrow="Items"
        title="Item Search"
        description="Dense item browsing with the clean route model, modern filters, and room to grow into live EQEmu queries."
      />
      <ItemSearchClient
        frameClassName={frameClassName}
        initialItems={[]}
        initialResultsResolved={false}
        initialFilters={{
          q,
          className,
          slot,
          type,
          minLevel: typeof params.minLevel === "string" ? params.minLevel : "",
          maxLevel: typeof params.maxLevel === "string" ? params.maxLevel : "",
          tradeable: tradeable === true ? "true" : tradeable === false ? "false" : ""
        }}
      />
    </div>
  );
}
