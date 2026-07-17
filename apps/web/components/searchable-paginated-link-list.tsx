"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@eq-alla/ui";
import { CompactPaginationControls } from "./catalog-shell";

type LinkEntry = {
  href: string;
  label: string;
};

export function SearchablePaginatedLinkList({
  items,
  emptyText,
  searchPlaceholder,
  pageSize = 12
}: {
  items: LinkEntry[];
  emptyText: string;
  searchPlaceholder: string;
  pageSize?: number;
}) {
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return items;
    }

    return items.filter((item) => item.label.toLowerCase().includes(normalized));
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [currentPage, filteredItems, pageSize]);

  return (
    <div className="space-y-4">
      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        className="h-10 rounded-xl border-white/12 bg-white/8 px-4 text-[#efe7d8] placeholder:text-[#9f8e79] focus:border-[#d7a45f] focus:bg-white/10"
      />

      {pagedItems.length > 0 ? (
        <div className="space-y-3">
          <div className="grid gap-2">
            {pagedItems.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className="group flex items-start justify-between gap-4 rounded-[14px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,23,31,0.94),rgba(11,15,22,0.92))] px-4 py-3 transition hover:border-[#c5a869]/42 hover:bg-[linear-gradient(180deg,rgba(35,42,53,0.96),rgba(16,20,28,0.92))]"
              >
                <span className="min-w-0 text-[15px] font-medium leading-6 text-[#e8decd] transition group-hover:text-white">{item.label}</span>
                <span className="shrink-0 text-[#8d7f6b] transition group-hover:text-[#dbc083]">→</span>
              </Link>
            ))}
          </div>

          <CompactPaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredItems.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : (
        <p className="text-[15px] leading-6 text-[#aeb8ca]">
          {query.trim() ? `No matches found for "${query.trim()}".` : emptyText}
        </p>
      )}
    </div>
  );
}
