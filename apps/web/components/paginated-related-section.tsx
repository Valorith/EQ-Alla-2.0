"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CompactPaginationControls } from "./catalog-shell";
import { entityLinkClass } from "@eq-alla/ui";

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
                  className={entityLinkClass}
                >
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <CompactPaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={items.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-[10px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,23,31,0.94),rgba(11,15,22,0.92))] px-4 py-3 shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
          <p className="text-[15px] text-[#aeb8ca]">{emptyText}</p>
        </div>
      )}
    </section>
  );
}
