import { expect, test } from "@playwright/test";

test("home page renders the catalog shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Norrath Atlas")).toBeVisible();
  await expect(page.getByText("Catalog coverage")).toBeVisible();
});

test("legacy route redirects to clean routes", async ({ page }) => {
  await page.goto("/?a=item&id=1001");
  await expect(page).toHaveURL(/\/items\/1001$/);
  await expect(page.getByText("Runed Mithril Bracer")).toBeVisible();
});
