import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbEntry = {
  label: string;
  href?: string;
};

/**
 * Upward navigation for detail routes. The sidebar shows which section you are
 * in but not how to get back out of a record, so every detail page carries this.
 */
export function Breadcrumbs({ entries, className = "" }: { entries: BreadcrumbEntry[]; className?: string }) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={`min-w-0 ${className}`.trim()}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] font-medium text-[var(--muted)]">
        <li className="flex items-center gap-x-1.5">
          <Link
            href="/"
            className="rounded-md px-1 py-0.5 transition hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Archive
          </Link>
          <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-[var(--muted)]/55" />
        </li>
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1;

          return (
            <li key={`${entry.href ?? "current"}-${entry.label}`} className="flex min-w-0 items-center gap-x-1.5">
              {entry.href && !isLast ? (
                <Link
                  href={entry.href}
                  className="rounded-md px-1 py-0.5 transition hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  {entry.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className="truncate px-1 py-0.5 text-[var(--muted-strong)]">
                  {entry.label}
                </span>
              )}
              {isLast ? null : <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-[var(--muted)]/55" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
