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
  await expect(page.getByRole("link", { name: /Items/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
