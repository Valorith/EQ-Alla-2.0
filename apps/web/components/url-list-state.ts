"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Writes a single search param without going through the Next router, so table
 * sorting and paging stay shareable in the URL without re-running the server
 * component (and therefore without re-triggering a search fetch).
 */
export function syncSearchParam(name: string, value: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);

  if (url.searchParams.get(name) === value) {
    return;
  }

  if (value === null) {
    url.searchParams.delete(name);
  } else {
    url.searchParams.set(name, value);
  }

  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function readSearchParam(name: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Re-asserts a param after every render. Submitting a filter replaces the URL
 * from the filter state alone, which drops the list params; this puts them back.
 * Passing a null name disables syncing entirely.
 */
export function useSyncedSearchParam(name: string | null, value: string | null) {
  useEffect(() => {
    if (name) {
      syncSearchParam(name, value);
    }
  });
}

const pageParamName = "page";

function readInitialPage() {
  const raw = readSearchParam(pageParamName);
  const parsed = raw === null ? 1 : Number(raw);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Page state mirrored into the URL, so a shared or bookmarked result link lands
 * on the same page.
 *
 * `resultKey` is the client's `displayKey` - the identity of the currently shown
 * result set. Paging resets when that key *changes*, but not when the first
 * result set arrives, which is what preserves a page number supplied by the URL
 * through the initial load. Clients therefore must not also reset the page
 * themselves on `displayKey`.
 */
export function useUrlPageState(resultKey: string): {
  page: number;
  setPage: (page: number) => void;
  resetPage: () => void;
  clampPage: (totalPages: number) => void;
} {
  const [page, setPage] = useState(readInitialPage);
  const seenResultKeyRef = useRef<string | null>(null);
  // The mount-time effects in each search client reset paging before any results
  // exist, which would discard a page supplied by the URL. Suppress those resets
  // until the first real result set lands.
  const honorUrlPageRef = useRef(true);

  useEffect(() => {
    if (!resultKey) {
      return;
    }

    if (seenResultKeyRef.current === null) {
      seenResultKeyRef.current = resultKey;
      honorUrlPageRef.current = false;
      return;
    }

    if (seenResultKeyRef.current !== resultKey) {
      seenResultKeyRef.current = resultKey;
      setPage(1);
    }
  }, [resultKey]);

  // The first page is the default, so it stays out of the URL.
  useSyncedSearchParam(pageParamName, page > 1 ? String(page) : null);

  const resetPage = useCallback(() => {
    if (honorUrlPageRef.current) {
      return;
    }

    setPage(1);
  }, []);

  /**
   * Clamps the page to the available range. Also gated on results having
   * arrived: an empty list reports one page, which would otherwise pull a
   * URL-supplied page back to 1 before the first fetch resolves.
   */
  const clampPage = useCallback((totalPages: number) => {
    if (honorUrlPageRef.current) {
      return;
    }

    setPage((current) => (current > totalPages ? totalPages : current));
  }, []);

  return { page, setPage, resetPage, clampPage };
}
