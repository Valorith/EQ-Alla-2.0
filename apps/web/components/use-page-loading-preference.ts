"use client";

import { useEffect, useState } from "react";
import {
  pageLoadingPreferenceCookieMaxAge,
  pageLoadingPreferenceCookieName,
  pageLoadingPreferenceStorageKey,
  parsePageLoadingPreference,
  readPageLoadingPreferenceFromCookieString,
  serializePageLoadingPreference
} from "./page-loading-preference";

function readPageLoadingPreferenceFromBrowser() {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    const storedValue = window.localStorage.getItem(pageLoadingPreferenceStorageKey);
    if (storedValue !== null) {
      return parsePageLoadingPreference(storedValue);
    }
  } catch {
    // Ignore storage access failures and fall back to cookies.
  }

  return readPageLoadingPreferenceFromCookieString(document.cookie);
}

function persistPageLoadingPreference(enabled: boolean) {
  if (typeof document === "undefined") {
    return;
  }

  const serialized = serializePageLoadingPreference(enabled);

  try {
    window.localStorage.setItem(pageLoadingPreferenceStorageKey, serialized);
  } catch {
    // Ignore storage access failures and rely on the cookie copy.
  }

  document.cookie = `${pageLoadingPreferenceCookieName}=${serialized}; path=/; max-age=${pageLoadingPreferenceCookieMaxAge}; samesite=lax`;
}

export function usePageLoadingPreference() {
  const [isPageLoadingEnabled, setIsPageLoadingEnabledState] = useState(() => readPageLoadingPreferenceFromBrowser());

  useEffect(() => {
    setIsPageLoadingEnabledState(readPageLoadingPreferenceFromBrowser());

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== pageLoadingPreferenceStorageKey) {
        return;
      }

      setIsPageLoadingEnabledState(readPageLoadingPreferenceFromBrowser());
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setIsPageLoadingEnabled = (enabled: boolean) => {
    setIsPageLoadingEnabledState(enabled);
    persistPageLoadingPreference(enabled);
  };

  return {
    isPageLoadingEnabled,
    setIsPageLoadingEnabled
  };
}
