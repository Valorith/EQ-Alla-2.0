import { defineConfig, devices } from "@playwright/test";

// Defaults away from 3000, which commonly collides with another local dev
// server. Override with PLAYWRIGHT_PORT when 3100 is taken too.
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./apps/web/tests",
  timeout: 60_000,
  retries: 0,
  globalSetup: "./apps/web/tests/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure"
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    env: { PORT: String(port) },
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] }
    }
  ]
});
