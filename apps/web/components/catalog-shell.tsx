import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Button, Card, CardContent } from "@eq-alla/ui";
import { ArrowRight } from "lucide-react";
import type { TableSortControl } from "./table-sorting";

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
  className = "",
  allowOverflow = false
}: {
  title: ReactNode;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
  allowOverflow?: boolean;
}) {
  return (
    <Card className={`${allowOverflow ? "overflow-visible" : "overflow-hidden"} border-white/10 bg-black/22 ${className}`.trim()}>
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
          className="group flex items-start justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-4 transition duration-200 hover:border-[var(--accent)] hover:bg-white/6"
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

export function SimpleTableHeaderRow({
  columns,
  sort,
  className
}: {
  columns: readonly string[];
  sort?: TableSortControl;
  className?: string;
}) {
  return (
    <tr className={className}>
      {columns.map((column, columnIndex) => {
        const isSortable = Boolean(sort?.sortableColumnIndexes.includes(columnIndex));
        const isActiveSort = isSortable && sort?.columnIndex === columnIndex;
        const nextDirection = isActiveSort && sort.direction === "ascending" ? "descending" : "ascending";

        return (
          <th
            key={column}
            scope="col"
            aria-sort={isSortable ? (isActiveSort ? sort.direction : "none") : undefined}
            className={`${isSortable ? "p-0" : "px-4 py-3"} text-[11px] font-semibold uppercase tracking-[0.22em]`}
          >
            {isSortable ? (
              <button
                type="button"
                onClick={() => sort?.onColumnChange(columnIndex)}
                aria-label={`Sort by ${column} ${nextDirection}`}
                title={`Sort by ${column} ${nextDirection}`}
                className={`group flex w-full items-center gap-1.5 px-4 py-3 text-left transition hover:bg-white/5 hover:text-[#f2c984] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d7a45f] ${
                  isActiveSort ? "text-[#f2c984]" : ""
                }`}
              >
                <span>{column}</span>
                <span
                  aria-hidden="true"
                  className={`inline-flex w-3.5 shrink-0 justify-center text-sm leading-none ${
                    isActiveSort ? "" : "opacity-45 transition group-hover:opacity-90"
                  }`}
                >
                  {isActiveSort ? (sort.direction === "ascending" ? "↑" : "↓") : "↕"}
                </span>
              </button>
            ) : (
              column
            )}
          </th>
        );
      })}
    </tr>
  );
}

export function SimpleTable({
  columns,
  rows,
  sort,
  rowKeys
}: {
  columns: readonly string[];
  rows: ReactNode[][];
  sort?: TableSortControl;
  rowKeys?: Array<string | number>;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#7b603b]/20 bg-[linear-gradient(180deg,rgba(35,30,27,0.86),rgba(18,20,24,0.84))] shadow-[0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur-md">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-[linear-gradient(180deg,rgba(215,164,95,0.08),rgba(255,255,255,0.02))] text-[#ccb594]">
          <SimpleTableHeaderRow columns={columns} sort={sort} />
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKeys?.[index] ?? index}
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

export function TableSkeleton({
  columnCount,
  rowCount = 8
}: {
  columnCount: number;
  rowCount?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-[#7b603b]/20 bg-[linear-gradient(180deg,rgba(35,30,27,0.86),rgba(18,20,24,0.84))] shadow-[0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur-md"
    >
      <div className="border-b border-white/8 bg-[linear-gradient(180deg,rgba(215,164,95,0.08),rgba(255,255,255,0.02))] px-4 py-3.5">
        <div className="h-3 w-32 rounded-full bg-white/10" />
      </div>
      <div className="grid gap-px">
        {Array.from({ length: rowCount }, (_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-6 border-t border-white/6 px-4 py-3.5">
            {Array.from({ length: columnCount }, (_, columnIndex) => (
              <div
                key={columnIndex}
                className="h-3 animate-pulse rounded-full bg-white/8 motion-reduce:animate-none"
                style={{ width: `${[38, 22, 14, 10, 10, 12][columnIndex % 6]}%`, animationDelay: `${(rowIndex * 90 + columnIndex * 60) % 600}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildPageList(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "end-gap", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "start-gap", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "start-gap", currentPage - 1, currentPage, currentPage + 1, "end-gap", totalPages];
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems <= pageSize || totalPages <= 1) {
    return null;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  const pageList = buildPageList(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9f8e79]">
        Showing {start}-{end} of {totalItems}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Go to previous page"
        >
          Previous
        </Button>
        {pageList.map((entry) =>
          typeof entry === "number" ? (
            <Button
              key={entry}
              type="button"
              variant={entry === currentPage ? "default" : "outline"}
              onClick={() => onPageChange(entry)}
              aria-current={entry === currentPage ? "page" : undefined}
              aria-label={entry === currentPage ? `Page ${entry}, current page` : `Go to page ${entry}`}
            >
              {entry}
            </Button>
          ) : (
            <span key={entry} className="px-1 text-sm text-[#9f8e79]">
              ...
            </span>
          )
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Go to next page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function CompactPaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel,
  formatTotal
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  formatTotal?: (value: number) => string;
}) {
  if (totalItems <= pageSize || totalPages <= 1) {
    return null;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  const formattedTotal = formatTotal ? formatTotal(totalItems) : totalItems;
  const compactButtonClassName =
    "rounded-lg border border-white/8 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#c8bea9] hover:border-white/14 hover:bg-white/[0.03]";

  return (
    <div className="flex flex-col gap-3 border-t border-white/8 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8f836f]">
        Showing {start}-{end} of {formattedTotal}
        {itemLabel ? ` ${itemLabel}` : ""}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          className={compactButtonClassName}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Go to previous page"
        >
          Prev
        </Button>
        <span aria-hidden="true" className="px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#8f836f]">
          {currentPage} / {totalPages}
        </span>
        <Button
          type="button"
          variant="ghost"
          className={compactButtonClassName}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Go to next page"
        >
          Next
        </Button>
      </div>
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
  value,
  onChange,
  options
}: {
  label: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{label}</span>
      <select
        name={name}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="h-11 rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-[#e8dfcf] outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_rgba(215,164,95,0.12)]"
      >
        <option value="" className="bg-[#1a1d23] text-[#e8dfcf]">Any</option>
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#1a1d23] text-[#e8dfcf]">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
