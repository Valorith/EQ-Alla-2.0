"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { minimumLoadingIndicatorMs } from "./loading-state";
import { ClassLoadingIndicator } from "./class-loading-indicator";

function buildRouteKey(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function shouldIgnoreAnchor(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== "_self") {
    return true;
  }

  if (anchor.hasAttribute("download")) {
    return true;
  }

  const href = anchor.getAttribute("href")?.trim() ?? "";
  return href.length === 0 || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:");
}

export function RouteLoadingOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const activeRouteKeyRef = useRef(buildRouteKey(pathname, searchParams));
  const startedAtRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);
  const failSafeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const nextRouteKey = buildRouteKey(pathname, searchParams);
    const routeChanged = activeRouteKeyRef.current !== nextRouteKey;
    activeRouteKeyRef.current = nextRouteKey;

    if (!routeChanged || !isRouteLoading) {
      return;
    }

    const elapsed = performance.now() - startedAtRef.current;
    const remaining = Math.max(0, minimumLoadingIndicatorMs - elapsed);

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = window.setTimeout(() => {
      setIsRouteLoading(false);
      hideTimerRef.current = null;
    }, remaining);

    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [isRouteLoading, pathname, searchParams]);

  useEffect(() => {
    const startRouteLoading = () => {
      startedAtRef.current = performance.now();
      setIsRouteLoading(true);

      if (failSafeTimerRef.current !== null) {
        window.clearTimeout(failSafeTimerRef.current);
      }

      failSafeTimerRef.current = window.setTimeout(() => {
        setIsRouteLoading(false);
        failSafeTimerRef.current = null;
      }, 10_000);
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || shouldIgnoreAnchor(anchor)) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.origin !== currentUrl.origin) {
        return;
      }

      if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search) {
        return;
      }

      startRouteLoading();
    };

    const handleSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLFormElement)) {
        return;
      }

      const method = (target.method || "get").toLowerCase();
      if (method !== "get") {
        return;
      }

      const action = target.getAttribute("action")?.trim() || window.location.href;
      const nextUrl = new URL(action, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.origin !== currentUrl.origin) {
        return;
      }

      const formData = new FormData(target);
      const nextParams = new URLSearchParams();
      for (const [key, value] of formData.entries()) {
        if (typeof value === "string" && value.length > 0) {
          nextParams.append(key, value);
        }
      }
      nextUrl.search = nextParams.toString();

      if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search) {
        return;
      }

      startRouteLoading();
    };

    window.addEventListener("click", handleClick, true);
    window.addEventListener("submit", handleSubmit, true);

    return () => {
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("submit", handleSubmit, true);

      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      if (failSafeTimerRef.current !== null) {
        window.clearTimeout(failSafeTimerRef.current);
        failSafeTimerRef.current = null;
      }
    };
  }, []);

  if (!isRouteLoading) {
    return null;
  }

  return <ClassLoadingIndicator fullScreen message="Loading page" detail="The gnome is flipping to the right entry." />;
}
