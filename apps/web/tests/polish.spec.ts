import { expect, test } from "@playwright/test";

test.describe("page metadata", () => {
  test("index routes get their own title", async ({ page }) => {
    await page.goto("/items");
    await expect(page).toHaveTitle("Item Search | EQ Alla 2.0");

    await page.goto("/spells");
    await expect(page).toHaveTitle("Spell Search | EQ Alla 2.0");
  });

  test("detail routes title from the record", async ({ page }) => {
    await page.goto("/items");
    await page.getByPlaceholder("Runed Mithril...").fill("cloak");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    const firstResult = page.locator('a[href^="/items/"]').first();
    await expect(firstResult).toBeVisible({ timeout: 20_000 });
    const name = (await firstResult.textContent())?.trim() ?? "";

    await firstResult.click();
    await expect(page).toHaveTitle(`${name} | EQ Alla 2.0`);

    // Canonical + description should be populated for link unfurls.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/items\/\d+$/);
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
    expect(ogTitle).toBe(`${name} | EQ Alla 2.0`);
  });
});

test.describe("breadcrumbs", () => {
  test("detail page offers a path back to the catalog", async ({ page }) => {
    await page.goto("/zones?q=a");
    // Scope to results: the sidebar also links to /zones/by-level and /zones/by-era.
    const firstZone = page
      .locator("#main-content")
      .locator('a[href^="/zones/"]:not([href*="/by-level"]):not([href*="/by-era"])')
      .first();
    await expect(firstZone).toBeVisible({ timeout: 20_000 });
    await firstZone.click();

    const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(crumbs).toBeVisible();
    await crumbs.getByRole("link", { name: "Zones" }).click();
    await expect(page).toHaveURL(/\/zones$/);
  });
});

test.describe("search hotkey", () => {
  test("slash focuses the search field", async ({ page }) => {
    await page.goto("/items");
    await page.locator("body").click();
    await page.keyboard.press("/");

    const focusedType = await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.type);
    expect(focusedType).toBe("search");
  });

  test("slash typed inside a field is not swallowed", async ({ page }) => {
    await page.goto("/items");
    const input = page.getByPlaceholder("Runed Mithril...");
    await input.click();
    await input.fill("");
    await page.keyboard.type("a/b");
    await expect(input).toHaveValue("a/b");
  });
});

test.describe("url list state", () => {
  test("sorting is reflected in the URL and restored from it", async ({ page }) => {
    await page.goto("/items?q=cloak");
    await expect(page.locator('a[href^="/items/"]').first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /Sort by AC/ }).click();
    await expect(page).toHaveURL(/[?&]sort=ac\b/);

    await page.getByRole("button", { name: /Sort by AC/ }).click();
    await expect(page).toHaveURL(/[?&]sort=-ac\b/);

    // A fresh load of that URL should come back sorted the same way.
    await page.goto("/items?q=cloak&sort=-ac");
    await expect(page.locator('a[href^="/items/"]').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Sort by AC/ })).toHaveAttribute("title", /Sort by AC ascending/);
  });

  test("page number survives a reload", async ({ page }) => {
    await page.goto("/items?q=a");
    await expect(page.locator('a[href^="/items/"]').first()).toBeVisible({ timeout: 20_000 });

    const nextButton = page.getByRole("button", { name: "Go to page 2" });
    test.skip((await nextButton.count()) === 0, "needs more than one page of results");

    await nextButton.click();
    await expect(page).toHaveURL(/[?&]page=2\b/);

    const firstOnPageTwo = await page.locator('a[href^="/items/"]').first().textContent();

    await page.goto("/items?q=a&page=2");
    await expect(page.locator('a[href^="/items/"]').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('a[href^="/items/"]').first()).toHaveText(firstOnPageTwo?.trim() ?? "");
    await expect(page).toHaveURL(/[?&]page=2\b/);
  });
});
