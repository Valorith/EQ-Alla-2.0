"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readSearchParam, useSyncedSearchParam } from "./url-list-state";

export type TableSortDirection = "ascending" | "descending";

export type TableSortValue = number | string | null | undefined;

export type TableSortColumn<Row> = {
  label: string;
  getSortValue?: (row: Row) => TableSortValue;
};

export type TableSortControl = {
  columnIndex: number | null;
  direction: TableSortDirection;
  onColumnChange: (columnIndex: number) => void;
  sortableColumnIndexes: readonly number[];
};

type UseTableSortOptions<Row> = {
  groupBy?: (row: Row) => number | string | null | undefined;
  onSortChange?: () => void;
  /**
   * Search param to mirror the active sort into, e.g. "sort". Values look like
   * `sort=item` (ascending) or `sort=-item` (descending), keyed on the column
   * label rather than its index so the link survives column reordering.
   */
  urlParam?: string;
};

const sortParamName = "sort";

export function toSortSlug(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readSortStateFromUrl<Row>(paramName: string, columns: readonly TableSortColumn<Row>[]) {
  const raw = readSearchParam(paramName);

  if (!raw) {
    return null;
  }

  const direction: TableSortDirection = raw.startsWith("-") ? "descending" : "ascending";
  const slug = raw.replace(/^-/, "");
  const columnIndex = columns.findIndex((column) => Boolean(column.getSortValue) && toSortSlug(column.label) === slug);

  return columnIndex === -1 ? null : { columnIndex, direction };
}

const tableSortCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function getLeadingSortNumber(value: string) {
  const match = value.match(/-?\d+/);
  return match ? Number(match[0]) : null;
}

function isMissingSortValue(value: TableSortValue) {
  return value === null || value === undefined || value === "" || (typeof value === "number" && !Number.isFinite(value));
}

function compareTableSortValues(left: TableSortValue, right: TableSortValue, direction: TableSortDirection) {
  const leftIsMissing = isMissingSortValue(left);
  const rightIsMissing = isMissingSortValue(right);

  if (leftIsMissing) {
    return rightIsMissing ? 0 : 1;
  }

  if (rightIsMissing) {
    return -1;
  }

  const comparison =
    typeof left === "number" && typeof right === "number"
      ? left - right
      : tableSortCollator.compare(String(left), String(right));

  return direction === "ascending" ? comparison : -comparison;
}

function stableSortRows<Row>(
  rows: Row[],
  getSortValue: (row: Row) => TableSortValue,
  direction: TableSortDirection
) {
  return rows
    .map((row, originalIndex) => ({ row, originalIndex }))
    .sort((left, right) => {
      const comparison = compareTableSortValues(getSortValue(left.row), getSortValue(right.row), direction);
      return comparison || left.originalIndex - right.originalIndex;
    })
    .map(({ row }) => row);
}

export function useTableSort<Row>(
  rows: Row[],
  columns: readonly TableSortColumn<Row>[],
  { groupBy, onSortChange, urlParam }: UseTableSortOptions<Row> = {}
) {
  const [sortState, setSortState] = useState<{ columnIndex: number | null; direction: TableSortDirection }>(
    () => (urlParam ? readSortStateFromUrl(urlParam, columns) : null) ?? { columnIndex: null, direction: "ascending" }
  );
  const previousColumnsRef = useRef(columns);

  const activeSortSlug =
    sortState.columnIndex === null ? null : toSortSlug(columns[sortState.columnIndex]?.label ?? "") || null;

  // Opt-in only: tables without a urlParam must not touch the shared "sort" key.
  useSyncedSearchParam(
    urlParam ?? null,
    activeSortSlug ? `${sortState.direction === "descending" ? "-" : ""}${activeSortSlug}` : null
  );

  useEffect(() => {
    if (previousColumnsRef.current === columns) {
      return;
    }

    previousColumnsRef.current = columns;
    setSortState({ columnIndex: null, direction: "ascending" });
  }, [columns]);

  const sortableColumnIndexes = useMemo(
    () => columns.flatMap((column, columnIndex) => (column.getSortValue ? [columnIndex] : [])),
    [columns]
  );

  const sortedRows = useMemo(() => {
    if (sortState.columnIndex === null) {
      return rows;
    }

    const getSortValue = columns[sortState.columnIndex]?.getSortValue;
    if (!getSortValue) {
      return rows;
    }

    if (!groupBy) {
      return stableSortRows(rows, getSortValue, sortState.direction);
    }

    const groups = new Map<number | string | null | undefined, Row[]>();
    for (const row of rows) {
      const key = groupBy(row);
      const group = groups.get(key);
      if (group) {
        group.push(row);
      } else {
        groups.set(key, [row]);
      }
    }

    return [...groups.values()].flatMap((group) => stableSortRows(group, getSortValue, sortState.direction));
  }, [columns, groupBy, rows, sortState]);

  const onColumnChange = useCallback(
    (columnIndex: number) => {
      if (!columns[columnIndex]?.getSortValue) {
        return;
      }

      setSortState((current) => ({
        columnIndex,
        direction:
          current.columnIndex === columnIndex && current.direction === "ascending" ? "descending" : "ascending"
      }));
      onSortChange?.();
    },
    [columns, onSortChange]
  );

  const sort = useMemo<TableSortControl>(
    () => ({
      columnIndex: sortState.columnIndex,
      direction: sortState.direction,
      onColumnChange,
      sortableColumnIndexes
    }),
    [onColumnChange, sortState, sortableColumnIndexes]
  );

  return { sortedRows, sort };
}
