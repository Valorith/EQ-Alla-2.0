import { cookies } from "next/headers";
import { ClassLoadingIndicator } from "../components/class-loading-indicator";
import { pageLoadingPreferenceCookieName, parsePageLoadingPreference } from "../components/page-loading-preference";

export default async function Loading() {
  const cookieStore = await cookies();
  const isPageLoadingEnabled = parsePageLoadingPreference(cookieStore.get(pageLoadingPreferenceCookieName)?.value);

  if (!isPageLoadingEnabled) {
    return null;
  }

  return (
    <ClassLoadingIndicator
      fullScreen
      message="Loading page"
      detail="The gnome is flipping to the right entry."
    />
  );
}
