import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Button, Card, CardContent } from "@eq-alla/ui";
import { ArrowRight } from "lucide-react";

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
  right,
  className = ""
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`overflow-hidden border-white/10 bg-black/22 ${className}`.trim()}>
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
    <div className="overflow-x-auto rounded-2xl border border-[#7b603b]/20 bg-[linear-gradient(180deg,rgba(35,30,27,0.86),rgba(18,20,24,0.84))] shadow-[0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur-md">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-[linear-gradient(180deg,rgba(215,164,95,0.08),rgba(255,255,255,0.02))] text-[#ccb594]">
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
            <tr
              key={index}
              className="border-t border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.008))] transition hover:bg-[linear-gradient(180deg,rgba(215,164,95,0.075),rgba(255,255,255,0.02))]"
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3.5 align-top text-[#e8dfcf]">
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

export function SearchPrompt({
  message = "Enter a search term to load results."
}: {
  message?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#7b603b]/28 bg-[linear-gradient(180deg,rgba(39,33,28,0.78),rgba(20,22,27,0.74))] px-4 py-6 text-sm text-[#d7ccbb]">
      {message}
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
