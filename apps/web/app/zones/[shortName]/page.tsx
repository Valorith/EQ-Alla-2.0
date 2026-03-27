import Link from "next/link";
import { notFound } from "next/navigation";
import { getZoneDetail } from "@eq-alla/data";
import { DefinitionGrid, LinkList, PageHero, SectionCard } from "../../../components/catalog";

type ZoneDetailPageProps = {
  params: Promise<{ shortName: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ZoneDetailPage({ params, searchParams }: ZoneDetailPageProps) {
  const { shortName } = await params;
  const zone = await getZoneDetail(shortName);
  const query = await searchParams;

  if (!zone) notFound();

  const mode = typeof query.mode === "string" ? query.mode : "npcs";

  const modeContent = {
    npcs: zone.bestiary,
    items: zone.itemDrops,
    forage: zone.forage,
    tasks: zone.tasks,
    spawngroups: zone.spawnGroups.map((group) => ({
      href: `/spawngroups/${group.id}`,
      label: group.name,
      meta: `${group.entries.length} entries • ${group.respawn}`
    }))
  } as const;

  return (
    <>
      <PageHero
        eyebrow="Zone Detail"
        title={zone.longName}
        description={`${zone.era} content with a recommended range of ${zone.levelRange}.`}
        badges={[zone.shortName, zone.population]}
      />
      <SectionCard title="Zone data">
        <DefinitionGrid
          items={[
            { label: "Safe point", value: zone.safePoint },
            { label: "Era", value: zone.era },
            { label: "Level range", value: zone.levelRange }
          ]}
        />
      </SectionCard>
      <SectionCard title="Resources">
        <div className="flex flex-wrap gap-2">
          {zone.resources.map((resource) => (
            <Link
              key={resource.href}
              href={resource.href}
              className="rounded-full border border-black/10 px-3 py-1.5 text-sm hover:bg-black/5"
            >
              {resource.label}
            </Link>
          ))}
        </div>
      </SectionCard>
      <SectionCard title={`Mode: ${mode}`}>
        {mode === "spawngroups" ? (
          <LinkList items={modeContent.spawngroups} />
        ) : (
          <LinkList
            items={(modeContent[mode as "npcs" | "items" | "forage" | "tasks"] ?? zone.bestiary).map((entry) => ({
              href: entry.href,
              label: entry.name
            }))}
          />
        )}
      </SectionCard>
    </>
  );
}
