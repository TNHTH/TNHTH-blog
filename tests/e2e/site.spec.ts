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
  const quietEdgeOpacity = await galaxy.locator(".galaxy-edge").evaluateAll((edges) => edges.map((edge) => getComputedStyle(edge).opacity));
  expect(quietEdgeOpacity.every((opacity) => opacity === "0")).toBe(true);
  const node = galaxy.locator(".galaxy-node-project").first();
  await node.dispatchEvent("pointerenter");
  await expect(node.locator("text")).toHaveCSS("opacity", "0.98");
  await expect(galaxy.locator(".galaxy-edge.is-near").first()).toHaveCSS("opacity", "0.9");
  await node.dispatchEvent("pointerleave");
  await expect(galaxy.locator(".galaxy-edge").first()).toHaveCSS("opacity", "0");
  await galaxy.locator("svg").dispatchEvent("wheel", { bubbles: true, cancelable: true, clientX: 700, clientY: 300, deltaY: -400 });
  await expect(galaxy).toHaveAttribute("data-graph-mode", "explore");
  await expect(page.locator(".home-hero")).toHaveClass(/is-exploring/);
  await expect(galaxy.locator("[data-galaxy-exit]")).toHaveCount(0);
  await page.waitForTimeout(1_100);
  await expect(galaxy).toHaveAttribute("data-graph-mode", "quiet");
  await expect(page.locator(".home-hero")).not.toHaveClass(/is-exploring/);
  expect(consoleErrors).toEqual([]);
});

test("首页星系每个节点都有真实入口，拖拽释放后回到聚合布局", async ({ page }) => {
  await page.goto("/");
  const galaxy = page.locator("[data-galaxy]");
  const nodes = galaxy.locator(".galaxy-node");
  const links = galaxy.locator(".galaxy-node-link");
  await expect(links).toHaveCount(await nodes.count());
  await expect(galaxy.locator(".galaxy-node-center .galaxy-node-link")).toHaveAttribute("href", "/about");
  await expect(galaxy.locator(".galaxy-node-project .galaxy-node-link").first()).toHaveAttribute("href", /\/projects\//);
  await expect(galaxy.locator(".galaxy-node-note .galaxy-node-link").first()).toHaveAttribute("href", /\/notes\//);

  const target = galaxy.locator(".galaxy-node-project").first().locator("circle").last();
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 120, startY + 80, { steps: 8 });
  await page.mouse.up();

  await expect(galaxy).toHaveAttribute("data-graph-mode", "restoring");
  await expect.poll(async () => galaxy.getAttribute("data-graph-mode"), { timeout: 2_000 }).toBe("quiet");
  const positions = await nodes.evaluateAll((elements) => elements.map((element) => ({ x: Number(element.getAttribute("data-node-x")), y: Number(element.getAttribute("data-node-y")), homeX: Number(element.getAttribute("data-node-home-x")), homeY: Number(element.getAttribute("data-node-home-y")) })));
  expect(positions.every(({ x, y, homeX, homeY }) => Math.abs(x - homeX) < 0.01 && Math.abs(y - homeY) < 0.01)).toBe(true);
});

test("portable server 返回自定义 404", async ({ page, request }) => {
  const htmlResponse = await request.get("/");
  expect(htmlResponse.headers()["cache-control"]).toContain("max-age=0");
  expect(htmlResponse.headers()["x-content-type-options"]).toBe("nosniff");
  await page.goto("/");
  const stylesheet = await page.locator('link[rel="stylesheet"]').first().getAttribute("href");
  expect(stylesheet).toBeTruthy();
  const assetResponse = await request.get(stylesheet!);
  expect(assetResponse.headers()["cache-control"]).toContain("immutable");
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
