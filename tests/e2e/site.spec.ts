import { expect, test } from "@playwright/test";

test("核心页面、中文语言和普通关系入口可访问", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/TNHTH-blog/);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByRole("heading", { name: "郭伟浩", exact: true })).toBeVisible();
  await expect(page.locator("[data-galaxy]")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("公开层");
  await page.getByRole("link", { name: "项目", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/?$/);
  await expect(page.getByRole("heading", { name: "做过的项目" })).toBeVisible();
  await page.getByRole("link", { name: "笔记", exact: true }).click();
  await expect(page).toHaveURL(/\/notes\/?$/);
  await expect(page.getByRole("heading", { name: "记录、思考与实验" })).toBeVisible();
});

test("中文搜索参数与 Pagefind 结果入口工作", async ({ page }) => {
  await page.goto("/notes?q=过拟合");
  await expect(page.locator("#note-search")).toHaveValue("过拟合");
  await expect(page.locator("#note-results")).toContainText("过拟合");
  await expect(page.locator("#pagefind-search")).toContainText("过拟合", { timeout: 10_000 });
});

test("首页星系只显示局部标签并增强局部关系", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.goto("/");
  const galaxy = page.locator("[data-galaxy]");
  await expect(galaxy).toBeVisible();
  const hiddenLabels = await galaxy.locator(".galaxy-node-project text").evaluateAll((labels) => labels.map((label) => getComputedStyle(label).opacity));
  expect(hiddenLabels.every((opacity) => opacity === "0")).toBe(true);
  const node = galaxy.locator(".galaxy-node-project").first();
  await node.dispatchEvent("pointerenter");
  await expect(node.locator("text")).toHaveCSS("opacity", "0.98");
  await expect(galaxy.locator(".galaxy-edge.is-near").first()).toHaveCSS("opacity", "0.9");
  await galaxy.locator("svg").dispatchEvent("wheel", { bubbles: true, cancelable: true, clientX: 700, clientY: 300, deltaY: -400 });
  await expect(galaxy).toHaveAttribute("data-graph-mode", "explore");
  await expect(page.locator(".home-hero")).toHaveClass(/is-exploring/);
  await galaxy.getByRole("button", { name: "返回介绍" }).click();
  await expect(galaxy).toHaveAttribute("data-graph-mode", "quiet");
  expect(consoleErrors).toEqual([]);
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
