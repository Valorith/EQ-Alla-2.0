"use client";

const minimumLoadingIndicatorMs = 350;

export async function waitForLoadingIndicator(startedAt: number, minimumMs = minimumLoadingIndicatorMs) {
  const elapsed = performance.now() - startedAt;
  const remaining = minimumMs - elapsed;

  if (remaining <= 0) {
    return;
  }

  await new Promise((resolve) => window.setTimeout(resolve, remaining));
}
