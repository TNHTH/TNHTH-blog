import { expect, test } from "@playwright/test";

const routes = ["/", "/work", "/notes", "/writing", "/gallery", "/about", "/admin"];

test.describe("static public site", () => {
  test("serves primary routes without runtime content fetches", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status(), route).toBe(200);
      expect(await page.locator("[data-live]").count(), route).toBe(0);
      expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toContain(route === "/" ? "example.invalid/" : route);
    }
    expect(requests.some((url) => url.includes("raw.githubusercontent.com") || url.includes("/api/"))).toBe(false);
  });

  test("uses a dynamic representative slug for detail pages", async ({ page }) => {
    await page.goto("/work", { waitUntil: "networkidle" });
    const workHref = await page.locator('a[href^="/work/"]').first().getAttribute("href");
    expect(workHref).toBeTruthy();
    const response = await page.goto(workHref!, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("article h1")).toBeVisible();
    await expect(page.locator("article")).toContainText("贡献");
  });

  test("keeps the main pages usable at 390, 768, and 1440 widths", async ({ page }) => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "networkidle" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `width ${width}`).toBe(true);
      await expect(page.locator("#hero-title")).toBeVisible();
    }
  });

  test("supports mobile navigation and theme toggle", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByText("菜单").click();
    await expect(page.locator('details[open] a[href="/work"]')).toBeVisible();
    await page.locator("#theme-toggle").click();
    await expect(page.locator("html[data-theme=dark]")).toHaveCount(1);
    await page.locator("#theme-toggle").click();
    await expect(page.locator("html[data-theme=dark]")).toHaveCount(0);
  });

  test("has accessible empty gallery and 404", async ({ page }) => {
    await page.goto("/gallery", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toContainText("图库");
    const missing = await page.goto("/this-route-does-not-exist", { waitUntil: "networkidle" });
    expect(missing?.status()).toBe(404);
    await expect(page.locator("main")).toContainText("404");
  });
});
