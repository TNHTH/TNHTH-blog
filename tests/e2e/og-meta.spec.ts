import { expect, test } from "@playwright/test";

test.describe("默认社交预览图", () => {
  test("首页在没有传 ogImage 时使用默认图，且图片真实可访问", async ({ page, request }) => {
    await page.goto("/");
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(ogImage).toContain("/og-default.png");
    const ogImageAlt = await page.locator('meta[property="og:image:alt"]').getAttribute("content");
    expect(ogImageAlt).toBeTruthy();
    expect(await page.locator('meta[property="og:image:width"]').getAttribute("content")).toBe("1200");
    expect(await page.locator('meta[property="og:image:height"]').getAttribute("content")).toBe("630");
    // og:image is always an absolute URL built from Astro.site (astro.config.mjs falls
    // back to the real production https://tnhth-portfolio.vercel.app when PUBLIC_SITE_URL
    // isn't set locally) — request that literal URL and Playwright would hit the live
    // production site instead of this test's local preview server. Only fetch the path.
    const ogImagePath = new URL(ogImage!).pathname;
    const response = await request.get(ogImagePath);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/");
  });

  test("笔记详情页也使用默认图", async ({ page }) => {
    await page.goto("/notes/overfitting");
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(ogImage).toContain("/og-default.png");
  });
});
