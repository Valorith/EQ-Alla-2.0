"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
};

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
  { groupBy, onSortChange }: UseTableSortOptions<Row> = {}
) {
  const [sortState, setSortState] = useState<{ columnIndex: number | null; direction: TableSortDirection }>({
    columnIndex: null,
    direction: "ascending"
  });
  const previousColumnsRef = useRef(columns);

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
