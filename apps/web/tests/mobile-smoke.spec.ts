import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

test("home page fits viewport and shows search", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("searchbox", { name: "Search Items, NPCs, etc..." })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("item detail page fits viewport", async ({ page }) => {
  await page.goto("/items/1001");
  // Scoped to the breadcrumb: the sidebar also has an "Items" link.
  await expect(page.getByLabel("Breadcrumb").getByRole("link", { name: "Items" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("npc loot drops section fits viewport", async ({ page }) => {
  await page.goto("/npcs/113457");
  await expect(page.getByRole("heading", { name: /The Avatar of War/i })).toBeVisible();
  await expect(page.getByText("Loot Drops")).toBeVisible();
  await expect(page.getByRole("button", { name: /Lab/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
