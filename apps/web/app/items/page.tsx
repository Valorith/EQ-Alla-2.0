import Link from "next/link";
import { listItems } from "@eq-alla/data";
import { Input } from "@eq-alla/ui";
import { FilterForm, PageHero, SearchPrompt, SectionCard, SelectField, SimpleTable } from "../../components/catalog-shell";
import { ItemIcon } from "../../components/item-icon";

type ItemsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const hasQuery = q.trim().length > 0;
  const className = typeof params.class === "string" ? params.class : "";
  const slot = typeof params.slot === "string" ? params.slot : "";
  const type = typeof params.type === "string" ? params.type : "";
  const minLevel = typeof params.minLevel === "string" ? Number(params.minLevel) : undefined;
  const maxLevel = typeof params.maxLevel === "string" ? Number(params.maxLevel) : undefined;
  const tradeable = params.tradeable === "true" ? true : params.tradeable === "false" ? false : undefined;
  const items = hasQuery ? await listItems({ q, className, slot, type, minLevel, maxLevel, tradeable }) : [];
  const frameClassName =
    "border-[#7b603b]/20 bg-[linear-gradient(180deg,rgba(38,32,28,0.82),rgba(18,20,25,0.8))] shadow-[0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur-md";

  return (
    <div className="eq-item-search-scope space-y-6">
      <PageHero
        eyebrow="Items"
        title="Item Search"
        description="Dense item browsing with the clean route model, modern filters, and room to grow into live EQEmu queries."
      />
      <SectionCard title="Filters" className={frameClassName}>
        <FilterForm action="/items">
          <label className="grid gap-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Name</span>
            <Input name="q" defaultValue={q} placeholder="Runed Mithril..." />
          </label>
          <SelectField
            label="Class"
            name="class"
            defaultValue={className}
            options={["Warrior", "Paladin", "Cleric", "Wizard", "Shaman"]}
          />
          <SelectField label="Slot" name="slot" defaultValue={slot} options={["Wrist", "Primary", "Inventory"]} />
          <SelectField label="Item type" name="type" defaultValue={type} options={["Armor", "Weapon", "Potion", "2H Blunt"]} />
          <SelectField label="Min level" name="minLevel" defaultValue={String(minLevel ?? "")} options={["1", "20", "35", "50", "60"]} />
          <SelectField label="Max level" name="maxLevel" defaultValue={String(maxLevel ?? "")} options={["20", "35", "50", "60", "65"]} />
          <SelectField label="Tradeable" name="tradeable" defaultValue={String(tradeable ?? "")} options={["true", "false"]} />
        </FilterForm>
      </SectionCard>
      <SectionCard title={hasQuery ? `${items.length} matching items` : "Results"} className={frameClassName}>
        {hasQuery ? (
          <SimpleTable
            columns={["Icon", "Item", "Type", "AC", "HP", "Mana", "Damage", "Delay", "Item ID"]}
            rows={items.map((item) => [
              <ItemIcon key={`${item.id}-icon`} icon={item.icon} name={item.name} size="sm" />,
              <div key={item.id} className="min-w-[180px]">
                <Link
                  href={`/items/${item.id}`}
                  className="font-medium text-[#f1e8d6] underline decoration-[#c9a772]/0 underline-offset-2 transition hover:text-[#fff5e2] hover:decoration-[#c9a772]/70"
                >
                  {item.name}
                </Link>
                <div className="mt-1 text-xs text-[#aa9d89]">{item.classes.join(" • ")}</div>
              </div>,
              item.type,
              item.ac || "—",
              item.hp || "—",
              item.mana || "—",
              item.damage || "—",
              item.delay || "—",
              item.id
            ])}
          />
        ) : (
          <SearchPrompt message="Enter an item name to load results." />
        )}
      </SectionCard>
    </div>
  );
}
