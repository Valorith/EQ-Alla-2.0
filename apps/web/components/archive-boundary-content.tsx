import Link from "next/link";
import type { ReactNode } from "react";
import { Input } from "@eq-alla/ui";
import { ArrowRight, Search } from "lucide-react";
import { PageHero, SectionCard } from "./catalog-shell";

const archiveShortcuts = [
  { href: "/items", label: "Items", meta: "Gear, weapons, and trade goods" },
  { href: "/npcs", label: "NPCs", meta: "Mobs, merchants, and named encounters" },
  { href: "/zones", label: "Zones", meta: "Levels, named lists, and zone resources" },
  { href: "/spells", label: "Spells", meta: "Class spells and effects" },
  { href: "/recipes", label: "Recipes", meta: "Tradeskill combines and components" },
  { href: "/zones/by-level", label: "Zones by Level", meta: "Find content for your level range" }
];

type ArchiveBoundaryContentProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  detail?: ReactNode;
};

export function ArchiveBoundaryContent({
  eyebrow,
  title,
  description,
  actions,
  detail
}: ArchiveBoundaryContentProps) {
  return (
    <div className="w-full space-y-6 px-1 pb-8 pt-2 sm:px-2">
      <PageHero eyebrow={eyebrow} title={title} description={description} actions={actions} />

      {detail ? (
        <SectionCard title="Details">
          <div className="text-sm leading-7 text-slate-300">{detail}</div>
        </SectionCard>
      ) : null}

      <SectionCard title="Search the archive">
        <div className="space-y-4">
          <p className="text-sm leading-7 text-slate-300">
            Try a different name, ID, or keyword. Global search covers items, NPCs, zones, spells, factions, and more.
          </p>
          <form action="/" className="relative max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-white/45" />
            <Input
              name="q"
              type="search"
              aria-label="Search items, NPCs, zones"
              placeholder="Search items, NPCs, zones..."
              className="border-white/12 bg-white/10 pl-11 text-white placeholder:text-white/45 focus:border-[#f0c36a] focus:bg-white/14"
            />
          </form>
        </div>
      </SectionCard>

      <SectionCard title="Browse the catalog">
        <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
          {archiveShortcuts.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 transition duration-200 hover:border-[#d7af68]/35 hover:bg-white/[0.05]"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#f0e6d6]">{item.label}</p>
                {item.meta ? <p className="mt-1 text-sm leading-6 text-[#98a3b7]">{item.meta}</p> : null}
              </div>
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-[#98a3b7] transition group-hover:translate-x-0.5 group-hover:text-[#dbbd83]" />
            </Link>
          ))}
        </div>
      </SectionCard>

      <div className="flex justify-center pt-2">
        <Link
          href="/"
          className="text-sm font-semibold text-[#dbbd83] underline decoration-[1.5px] underline-offset-4 transition hover:text-[#f0d8a0]"
        >
          Return to home
        </Link>
      </div>
    </div>
  );
}
