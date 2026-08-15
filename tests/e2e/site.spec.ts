import { expect, test } from "@playwright/test";

test("核心页面、中文语言和普通关系入口可访问", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/TNHTH-blog/);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByRole("link", { name: "查看项目" })).toBeVisible();
  await page.getByRole("link", { name: "项目", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/?$/);
  await expect(page.getByRole("heading", { name: "成果档案" })).toBeVisible();
  await page.getByRole("link", { name: "笔记", exact: true }).click();
  await expect(page).toHaveURL(/\/notes\/?$/);
  await expect(page.getByRole("heading", { name: "统一内容池" })).toBeVisible();
});

test("中文搜索参数与 Pagefind 结果入口工作", async ({ page }) => {
  await page.goto("/notes?q=过拟合");
  await expect(page.locator("#note-search")).toHaveValue("过拟合");
  await expect(page.locator("#note-results")).toContainText("过拟合");
  await expect(page.locator("#pagefind-search")).toContainText("过拟合", { timeout: 10_000 });
});

test("portable server 返回自定义 404", async ({ page, request }) => {
  const response = await request.get("/this-route-does-not-exist-123");
  expect(response.status()).toBe(404);
  await page.goto("/404");
  await expect(page.getByText("这个页面不在档案中。")).toBeVisible();
});

test("旧公开 URL 保留兼容页面", async ({ page }) => {
  await page.goto("/work/dashgo-rl-navigation");
  await expect(page.locator("link[rel=\"canonical\"]")).toHaveAttribute("href", /\/projects\/dashgo-rl-navigation\/?$/);
  await page.goto("/gallery");
  await expect(page.getByRole("link", { name: "笔记", exact: true }).first()).toBeVisible();
});
