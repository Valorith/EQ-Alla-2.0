import { notFound } from "next/navigation";
import { getZoneDetail } from "@eq-alla/data";
import { LinkList, PageHero, SectionCard } from "../../../../components/catalog-shell";

type ZoneNamedPageProps = {
  params: Promise<{ shortName: string }>;
};

export default async function ZoneNamedPage({ params }: ZoneNamedPageProps) {
  const { shortName } = await params;
  const zone = await getZoneDetail(shortName);

  if (!zone) notFound();

  return (
    <>
      <PageHero eyebrow="Zone Detail" title={`${zone.longName} Named Mobs`} description="Legacy named-mob view rebuilt as a focused subpage." />
      <SectionCard title={`${zone.namedNpcs.length} named NPCs`}>
        <LinkList items={zone.namedNpcs.map((entry) => ({ href: entry.href, label: entry.name }))} />
      </SectionCard>
    </>
  );
}
