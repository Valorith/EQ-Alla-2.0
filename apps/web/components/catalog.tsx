import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Button, Card, CardContent, Input } from "@eq-alla/ui";
import { ArrowRight, Database, Search, ShieldCheck } from "lucide-react";

export function Shell({
  children,
  searchQuery
}: {
  children: ReactNode;
  searchQuery?: string;
}) {
  const navGroups = [
    {
      label: "Archive",
      items: [
        { href: "/items", label: "Items" },
        { href: "/spells", label: "Spells" },
        { href: "/npcs", label: "NPCs" },
        { href: "/zones", label: "Zones" }
      ]
    },
    {
      label: "Reference",
      items: [
        { href: "/factions", label: "Factions" },
        { href: "/recipes", label: "Recipes" },
        { href: "/pets", label: "Pets" },
        { href: "/tasks", label: "Tasks" }
      ]
    },
    {
      label: "Browse",
      items: [
        { href: "/search?q=mistmoore", label: "Global Search" },
        { href: "/npcs/advanced", label: "Advanced NPCs" },
        { href: "/zones/by-level", label: "Zones by Level" },
        { href: "/zones/by-era", label: "Zones by Era" }
      ]
    }
  ];

  return (
    <div className="mx-auto min-h-screen max-w-[1680px] px-3 py-3 md:px-5 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
        <aside>
          <div className="eq-sidebar-surface eq-shell-glow sticky top-3 overflow-hidden rounded-[26px] border border-[var(--sidebar-border)]">
            <div className="relative z-10 flex min-h-[calc(100vh-1.5rem)] flex-col gap-6 p-5 text-[var(--sidebar-text)]">
              <div className="space-y-4">
                <Link href="/" className="block">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--sidebar-muted)]">
                    Read-only EverQuest archive
                  </p>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="eq-wordmark text-[2.45rem] font-semibold leading-none text-[#f3c54f]">EQ Alla</span>
                    <span className="pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f0d8a0]/80">2.0</span>
                  </div>
                </Link>

                <p className="max-w-xs text-sm leading-6 text-[var(--sidebar-muted)]">
                  Alla-style EQ research rebuilt into a Spire-adjacent shell with cleaner browse flows and modern routes.
                </p>
              </div>

              <form action="/search" className="space-y-3">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sidebar-muted)]">
                  Search the archive
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/45" />
                  <Input
                    type="search"
                    name="q"
                    placeholder="Search zones, NPCs, items..."
                    defaultValue={searchQuery}
                    className="border-white/12 bg-white/10 pl-11 text-white placeholder:text-white/45 focus:border-[#f0c36a] focus:bg-white/14"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Open search
                </Button>
              </form>

              <nav className="grid gap-5">
                {navGroups.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--sidebar-muted)]">{group.label}</p>
                    <div className="grid gap-1.5">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-white/88 transition hover:bg-white/10 hover:text-white"
                        >
                          <span>{item.label}</span>
                          <ArrowRight className="size-4 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/85" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="mt-auto grid gap-3">
                <div className="rounded-2xl border border-white/12 bg-black/18 p-4 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-emerald-400/12">
                      <ShieldCheck className="size-4 text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Read-only by design</p>
                      <p className="mt-1 text-xs leading-5 text-white/70">
                        Built for mirrored EQEmu data with mock-mode fallback while live mappings are wired in.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/12 bg-black/18 p-4 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-[#f3c54f]/14">
                      <Database className="size-4 text-[#f3c54f]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Legacy links preserved</p>
                      <p className="mt-1 text-xs leading-5 text-white/70">
                        Old `?a=` links, task pages, and spawngroup routes redirect into the new information architecture.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 rounded-[28px] border border-white/10 bg-black/20 p-3 backdrop-blur-sm xl:p-4">
          <div className="flex min-w-0 flex-col gap-4">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  badges,
  actions
}: {
  eyebrow: string;
  title: string;
  description: string;
  badges?: string[];
  actions?: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-white/10 bg-transparent">
      <CardContent className="eq-hero-surface relative overflow-hidden border border-white/10">
        <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#dcb46e]">{eyebrow}</p>
            <div className="space-y-3">
              <h2 className="max-w-4xl font-[var(--font-display)] text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl xl:text-[2.45rem]">
                {title}
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{description}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:items-end">
            {actions}
            {badges && badges.length > 0 ? (
              <div className="flex flex-wrap gap-2 xl:justify-end">
                {badges.map((badge) => (
                  <Badge key={badge} className="border-white/12 bg-white/8 text-slate-100">
                    {badge}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SectionCard({
  title,
  children,
  right
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-white/10 bg-black/22">
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-[var(--font-display)] text-[1.25rem] font-semibold tracking-[-0.03em] text-white">{title}</h3>
          {right}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function DefinitionGrid({
  items
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{item.label}</dt>
          <dd className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LinkList({
  items
}: {
  items: Array<{ href: string; label: string; meta?: string }>;
}) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <Link
          key={`${item.href}-${item.label}`}
          href={item.href}
          className="group flex items-start justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-4 transition duration-200 hover:border-[var(--accent)] hover:bg-white"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--foreground)]">{item.label}</p>
            {item.meta ? <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.meta}</p> : null}
          </div>
          <ArrowRight className="mt-0.5 size-4 shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--foreground)]" />
        </Link>
      ))}
    </div>
  );
}

export function SimpleTable({
  columns,
  rows
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-black/[0.03] text-[var(--muted)]">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em]">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-[var(--border)] bg-white/60 transition hover:bg-white">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3.5 align-top text-[var(--muted-strong)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FilterForm({
  action,
  children
}: {
  action: string;
  children: ReactNode;
}) {
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {children}
      <div className="flex items-end">
        <Button type="submit" className="w-full">
          Apply filters
        </Button>
      </div>
    </form>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  options
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: string[];
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-11 rounded-xl border border-[var(--border-strong)] bg-white/94 px-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_rgba(215,164,95,0.12)]"
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
