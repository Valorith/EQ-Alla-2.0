"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@eq-alla/ui";

type RelatedEntry = {
  href: string;
  label: string;
};

export function PaginatedRelatedSection({
  title,
  items,
  emptyText,
  pageSize = 10
}: {
  title: string;
  items: RelatedEntry[];
  emptyText: string;
  pageSize?: number;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [currentPage, items, pageSize]);
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, items.length);

  return (
    <section className="space-y-3">
      <div className="rounded-[10px] border border-white/10 bg-[linear-gradient(180deg,rgba(47,54,66,0.96),rgba(35,41,52,0.92))] px-3 py-2 text-[16px] font-semibold text-[#ddd2b5] shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
        {title}
      </div>
      {items.length > 0 ? (
        <div className="rounded-[10px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,23,31,0.94),rgba(11,15,22,0.92))] px-4 py-3 shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
          <ul className="list-disc space-y-2 pl-7 text-[15px] text-[#dfe4ee] marker:text-[#c5a869]">
            {pagedItems.map((entry) => (
              <li key={`${title}-${entry.href}`}>
                <Link
                  href={entry.href}
                  className="font-medium text-[#7ab8ff] underline decoration-[1.5px] underline-offset-2 transition hover:text-[#a7d2ff] hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ab8ff]/35"
                >
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
          {totalPages > 1 ? (
            <div className="mt-4 flex flex-col gap-3 border-t border-white/8 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8f836f]">
                Showing {start}-{end} of {items.length}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-lg border border-white/8 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#c8bea9] hover:border-white/14 hover:bg-white/[0.03]"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-lg border border-white/8 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#c8bea9] hover:border-white/14 hover:bg-white/[0.03]"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[10px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,23,31,0.94),rgba(11,15,22,0.92))] px-4 py-3 shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
          <p className="text-[15px] text-[#aeb8ca]">{emptyText}</p>
        </div>
      )}
    </section>
  );
}
