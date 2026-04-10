"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@eq-alla/ui";
import { CoinDisplay } from "./coin-display";
import { ItemIcon } from "./item-icon";

type NpcSellEntry = {
  id: number;
  name: string;
  href?: string;
  icon: string;
  price: string;
  coinValue: { pp: number; gp: number; sp: number; cp: number } | null;
};

const merchantPageSize = 5;

export function NpcSellList({ items }: { items: NpcSellEntry[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / merchantPageSize));

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * merchantPageSize;
    return items.slice(start, start + merchantPageSize);
  }, [currentPage, items]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {pagedItems.map((entry, index) => {
          const content = (
            <>
              <ItemIcon icon={entry.icon} name={entry.name} size="sm" tooltipItemId={entry.href ? entry.id : undefined} />
              <div className="min-w-0">
                <p className={`truncate text-[15px] font-semibold text-[#e6e0d2]${entry.href ? " transition group-hover:text-white" : ""}`}>
                  {entry.name}
                </p>
                {entry.coinValue ? (
                  <CoinDisplay value={entry.coinValue} className="pt-0.5 text-[12px] text-[#9f8e79]" />
                ) : (
                  <p className="text-[12px] uppercase tracking-[0.18em] text-[#9f8e79]">{entry.price}</p>
                )}
              </div>
            </>
          );

          if (!entry.href) {
            return (
              <div
                key={`${entry.id}-${index}`}
                className="flex items-center gap-3 rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.94),rgba(10,14,21,0.92))] px-3 py-3"
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={`${entry.id}-${index}`}
              href={entry.href}
              className="group flex items-center gap-3 rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.94),rgba(10,14,21,0.92))] px-3 py-3 transition hover:border-[#c5a869]/45 hover:bg-[linear-gradient(180deg,rgba(35,42,53,0.96),rgba(16,20,28,0.92))]"
            >
              {content}
            </Link>
          );
        })}
      </div>

      {items.length > merchantPageSize ? (
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9f8e79]">
            Showing {(currentPage - 1) * merchantPageSize + 1}-{Math.min(currentPage * merchantPageSize, items.length)} of {items.length}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
              Previous
            </Button>
            <Button type="button" variant="outline" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
