"use client";

import Link from "next/link";
import type { ZoneSummary } from "@eq-alla/data";
import { SimpleTable } from "../../../../components/catalog-shell";
import {
  getLeadingSortNumber,
  useTableSort,
  type TableSortColumn
} from "../../../../components/table-sorting";

const zoneEraTableColumns: TableSortColumn<ZoneSummary>[] = [
  { label: "Zone", getSortValue: (zone) => zone.longName },
  { label: "Level range", getSortValue: (zone) => getLeadingSortNumber(zone.levelRange) }
];
const zoneEraTableColumnLabels = zoneEraTableColumns.map((column) => column.label);

export function ZonesByEraTable({ zones }: { zones: ZoneSummary[] }) {
  const { sortedRows, sort } = useTableSort(zones, zoneEraTableColumns);

  return (
    <SimpleTable
      columns={zoneEraTableColumnLabels}
      sort={sort}
      rows={sortedRows.map((zone) => [
        <Link key={zone.shortName} href={`/zones/${zone.shortName}`} className="font-medium hover:underline">
          {zone.longName}
        </Link>,
        zone.levelRange
      ])}
    />
  );
}
