import { expect, test } from "@playwright/test";

test("home page renders the catalog shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /EQ Alla 2.0/i })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search Items, NPCs, etc..." })).toBeVisible();
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
