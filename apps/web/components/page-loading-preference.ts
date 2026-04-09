export const pageLoadingPreferenceStorageKey = "eq-alla.page-loading-animation";
export const pageLoadingPreferenceCookieName = "eq_alla_page_loading_animation";
export const pageLoadingPreferenceCookieMaxAge = 60 * 60 * 24 * 365;

export function parsePageLoadingPreference(value: string | null | undefined) {
  if (value === "false" || value === "0") {
    return false;
  }

  if (value === "true" || value === "1") {
    return true;
  }

  return false;
}

export function serializePageLoadingPreference(enabled: boolean) {
  return enabled ? "true" : "false";
}

export function readPageLoadingPreferenceFromCookieString(cookieString: string | null | undefined) {
  if (!cookieString) {
    return false;
  }

  const prefix = `${pageLoadingPreferenceCookieName}=`;

  for (const part of cookieString.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return parsePageLoadingPreference(trimmed.slice(prefix.length));
    }
  }

  return false;
}
