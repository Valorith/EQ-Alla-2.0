import Link from "next/link";
import { listItems } from "@eq-alla/data";
import { Input } from "@eq-alla/ui";
import { FilterForm, PageHero, SectionCard, SelectField, SimpleTable } from "../../components/catalog";

type ItemsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const className = typeof params.class === "string" ? params.class : "";
  const slot = typeof params.slot === "string" ? params.slot : "";
  const tradeable = params.tradeable === "true" ? true : params.tradeable === "false" ? false : undefined;
  const items = await listItems({ q, className, slot, tradeable });

  return (
    <>
      <PageHero
        eyebrow="Items"
        title="Item Search"
        description="Dense item browsing with the clean route model, modern filters, and room to grow into live EQEmu queries."
      />
      <SectionCard title="Filters">
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
          <SelectField label="Tradeable" name="tradeable" defaultValue={String(tradeable ?? "")} options={["true", "false"]} />
        </FilterForm>
      </SectionCard>
      <SectionCard title={`${items.length} matching items`}>
        <SimpleTable
          columns={["Name", "Type", "Slot", "Classes", "Level", "Zone"]}
          rows={items.map((item) => [
            <Link key={item.id} href={`/items/${item.id}`} className="font-medium hover:underline">
              {item.name}
            </Link>,
            item.type,
            item.slot,
            item.classes.join(", "),
            item.levelRequired,
            item.zone
          ])}
        />
      </SectionCard>
    </>
  );
}
