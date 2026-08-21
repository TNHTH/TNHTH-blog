import { expect, test } from "@playwright/test";

test.describe("主题早绑定", () => {
  test("没有 localStorage、系统为 dark 时首屏是 dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("没有 localStorage、系统为 light 时首屏是 light", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  });

  test("localStorage 存了 light、系统为 dark 时以用户选择为准", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => localStorage.setItem("tnhth-theme", "light"));
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  });

  test("localStorage 存了 dark、系统为 light 时以用户选择为准", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(() => localStorage.setItem("tnhth-theme", "dark"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("dark 偏好在 DOMContentLoaded 之前已经解析完成", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("tnhth-theme", "dark"));
    await page.goto("/");
    const themeAtDomContentLoaded = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(themeAtDomContentLoaded).toBe("dark");
  });

  test("点击按钮切换主题并写入 localStorage", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
    await page.click("#theme-toggle");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const stored = await page.evaluate(() => localStorage.getItem("tnhth-theme"));
    expect(stored).toBe("dark");
  });

  test("localStorage 值非法时按系统偏好处理", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => localStorage.setItem("tnhth-theme", "not-a-real-value"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
