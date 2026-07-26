import type { FullConfig } from "@playwright/test";

/**
 * Fails fast when the server answering baseURL is not this app.
 *
 * `reuseExistingServer` will happily adopt whatever is already bound to the
 * port, so an unrelated dev server on the same port used to produce a full run
 * of confusing assertion failures instead of one clear error.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL;

  if (!baseURL) {
    throw new Error("Playwright baseURL is not configured.");
  }

  let html: string;

  try {
    const response = await fetch(baseURL, { signal: AbortSignal.timeout(30_000) });
    html = await response.text();
  } catch (error) {
    throw new Error(`Could not reach the app under test at ${baseURL}: ${(error as Error).message}`);
  }

  if (!html.includes('name="application-name" content="EQ Alla')) {
    throw new Error(
      `The server at ${baseURL} is not EQ Alla. Something else is bound to that port; ` +
        "stop it or set PLAYWRIGHT_PORT to a free port before running the e2e suite."
    );
  }
}
