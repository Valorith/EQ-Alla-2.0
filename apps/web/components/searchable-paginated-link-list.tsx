"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Input } from "@eq-alla/ui";

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

  const start = filteredItems.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(currentPage * pageSize, filteredItems.length);

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

          {filteredItems.length > pageSize ? (
            <div className="flex flex-col gap-3 border-t border-white/8 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8f836f]">
                Showing {start}-{end} of {filteredItems.length}
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
        <p className="text-[15px] leading-6 text-[#aeb8ca]">
          {query.trim() ? `No matches found for "${query.trim()}".` : emptyText}
        </p>
      )}
    </div>
  );
}
