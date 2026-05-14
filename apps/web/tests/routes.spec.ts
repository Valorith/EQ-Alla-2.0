import { expect, test } from "@playwright/test";

test("home page renders the catalog shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /EQ Alla 2.0/i })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search Items, NPCs, etc..." })).toBeVisible();
});

test("home page search stays clear of the desktop sidebar at narrow desktop widths", async ({ page }) => {
  for (const width of [1440, 1366, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const sidebarBox = await page.locator("aside").boundingBox();
    const searchBox = await page.getByRole("searchbox", { name: "Search Items, NPCs, etc..." }).boundingBox();

    expect(sidebarBox).toBeTruthy();
    expect(searchBox).toBeTruthy();
    expect(searchBox!.x).toBeGreaterThanOrEqual(sidebarBox!.x + sidebarBox!.width + 16);
  }
});

test("legacy route redirects to clean routes", async ({ page }) => {
  await page.goto("/?a=item&id=1001");
  await expect(page).toHaveURL(/\/items\/1001$/);
  await expect(page.getByRole("link", { name: /Items/i })).toBeVisible();
});

test("index.php legacy routes redirect to clean routes", async ({ page }) => {
  await page.goto("/index.php?a=item&id=1001");
  await expect(page).toHaveURL(/\/items\/1001$/);
  await expect(page.getByRole("link", { name: /Items/i })).toBeVisible();
});

test("undiscovered item routes show a custom unavailable message", async ({ page }) => {
  const response = await page.goto("/items/150873");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: /Item 150873 has not been discovered yet/i })).toBeVisible();
  await expect(page.getByText(/detail page stays hidden until that item has been discovered in-game/i)).toBeVisible();
});

test("unknown legacy php routes fall back to the home page", async ({ page }) => {
  await page.goto("/mystery.php?a=not_real");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("searchbox", { name: "Search Items, NPCs, etc..." })).toBeVisible();
});

test("spell rows keep their applied class while draft class filters are pending", async ({ page }) => {
  await page.goto("/spells?q=torrent");

  const draughtRow = page.getByRole("row").filter({ hasText: "Draught of Fire" });
  await expect(draughtRow).toContainText("Wizard");

  await page.getByLabel("Class").selectOption("Shadow Knight");

  await expect(page.getByText("Press Search to apply filters")).toBeVisible();
  await expect(draughtRow).toContainText("Wizard");
  await expect(draughtRow).not.toContainText("Shadow Knight");
  await expect(page.getByText(/^Level 0$/)).toHaveCount(0);

  await page.getByRole("button", { name: "Search" }).click();

  await expect(page.getByText("3 matching spells")).toBeVisible();
  await expect(page.getByText(/^Level 0$/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Torrent of Hate" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Draught of Fire" })).toHaveCount(0);
});
