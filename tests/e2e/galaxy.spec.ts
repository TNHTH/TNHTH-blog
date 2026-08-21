import { expect, test, type Page } from "@playwright/test";

type NodeSnapshot = {
  id: string;
  kind: string;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  transform: string;
};

const readNodes = (page: Page) => page.locator(".galaxy-node[data-node-id]").evaluateAll((elements) => elements.map((element) => {
  const transform = element.getAttribute("transform") ?? "";
  const match = transform.match(/translate\(\s*([^\s,)]+)[,\s]+([^\s,)]+)/);
  return {
    id: element.getAttribute("data-node-id") ?? "",
    kind: element.getAttribute("data-node-kind") ?? "",
    homeX: Number(element.getAttribute("data-node-x")),
    homeY: Number(element.getAttribute("data-node-y")),
    x: Number(match?.[1]),
    y: Number(match?.[2]),
    transform,
  };
}));

const readStage = (page: Page) => page.locator("[data-galaxy-stage]").getAttribute("transform");

const assertFiniteNodes = (nodes: NodeSnapshot[]) => {
  expect(nodes.every((node) => Number.isFinite(node.homeX) && Number.isFinite(node.homeY) && Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
  expect(nodes.every((node) => !/NaN|Infinity|undefined/.test(node.transform))).toBe(true);
};

test("quiet 首屏不自动漂移且 home dataset 保持不变", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const before = await readNodes(page);
  assertFiniteNodes(before);

  await page.waitForTimeout(1_400);

  const after = await readNodes(page);
  assertFiniteNodes(after);
  const beforeById = new Map(before.map((node) => [node.id, node]));
  const maxDrift = Math.max(...after.map((node) => {
    const initial = beforeById.get(node.id);
    return initial ? Math.hypot(node.x - initial.x, node.y - initial.y) : Infinity;
  }));
  const maxHomeDrift = Math.max(...after.map((node) => {
    const initial = beforeById.get(node.id);
    return initial ? Math.hypot(node.homeX - initial.homeX, node.homeY - initial.homeY) : Infinity;
  }));

  expect(maxDrift).toBeLessThan(0.01);
  expect(maxHomeDrift).toBeLessThan(0.01);
});

test("Galaxy 节点数量受硬上限约束且没有悬空边", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const counts = await page.locator(".galaxy-node[data-node-id]").evaluateAll((elements) => elements.reduce<Record<string, number>>((result, element) => {
    const kind = element.getAttribute("data-node-kind") ?? "";
    result[kind] = (result[kind] ?? 0) + 1;
    return result;
  }, {}));

  expect(counts.center ?? 0).toBeLessThanOrEqual(1);
  expect(counts.project ?? 0).toBeLessThanOrEqual(6);
  expect(counts.topic ?? 0).toBeLessThanOrEqual(8);
  expect(counts.note ?? 0).toBeLessThanOrEqual(10);
  expect(Object.values(counts).reduce((total, count) => total + count, 0)).toBeLessThanOrEqual(25);

  const danglingEdges = await page.evaluate(() => {
    const nodeIds = new Set([...document.querySelectorAll<SVGGElement>(".galaxy-node[data-node-id]")].map((node) => node.dataset.nodeId));
    return [...document.querySelectorAll<SVGLineElement>(".galaxy-edge")]
      .filter((edge) => !nodeIds.has(edge.dataset.source) || !nodeIds.has(edge.dataset.target))
      .map((edge) => `${edge.dataset.source}->${edge.dataset.target}`);
  });
  expect(danglingEdges).toEqual([]);
});

test("交互前后 runtime coordinate 不包含非法值", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  assertFiniteNodes(await readNodes(page));

  const svg = page.locator("[data-galaxy] svg");
  const box = await svg.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.45);
  await page.mouse.wheel(0, -300);
  assertFiniteNodes(await readNodes(page));
  await page.waitForTimeout(1_500);
  assertFiniteNodes(await readNodes(page));
});

test("节点拖动结束后精确恢复 home coordinate", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const galaxy = page.locator("[data-galaxy]");
  const node = page.locator(".galaxy-node-project[data-node-id]").first();
  const home = await node.evaluate((element) => ({
    x: Number(element.getAttribute("data-node-x")),
    y: Number(element.getAttribute("data-node-y")),
  }));
  const box = await node.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 55, { steps: 8 });
  await expect(galaxy).toHaveAttribute("data-graph-mode", "explore");
  await page.mouse.up();
  await expect(galaxy).toHaveAttribute("data-graph-mode", "quiet", { timeout: 5_000 });

  const restored = await node.evaluate((element) => {
    const transform = element.getAttribute("transform") ?? "";
    const match = transform.match(/translate\(\s*([^\s,)]+)[,\s]+([^\s,)]+)/);
    return {
      x: Number(match?.[1]),
      y: Number(match?.[2]),
      homeX: Number(element.getAttribute("data-node-x")),
      homeY: Number(element.getAttribute("data-node-y")),
    };
  });
  expect(restored.homeX).toBe(home.x);
  expect(restored.homeY).toBe(home.y);
  expect(Math.hypot(restored.x - home.x, restored.y - home.y)).toBeLessThan(0.01);
});

test("wheel 和 pan 结束后 view 恢复 identity", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const galaxy = page.locator("[data-galaxy]");
  const svg = page.locator("[data-galaxy] svg");
  const box = await svg.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.38);
  await page.mouse.wheel(0, -350);
  await expect(galaxy).toHaveAttribute("data-graph-mode", "explore");
  await expect(galaxy).toHaveAttribute("data-graph-mode", "quiet", { timeout: 5_000 });
  expect(await readStage(page)).toBe("translate(0 0) scale(1)");

  await page.mouse.move(box.x + box.width * 0.12, box.y + box.height * 0.78);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.72, { steps: 6 });
  await page.mouse.up();
  await expect(galaxy).toHaveAttribute("data-graph-mode", "quiet", { timeout: 5_000 });
  expect(await readStage(page)).toBe("translate(0 0) scale(1)");
});

test("desktop 和 mobile Galaxy 有尺寸、分布且没有横向溢出", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 360, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "networkidle" });
    const metrics = await page.evaluate(() => {
      const galaxy = document.querySelector<HTMLElement>("[data-galaxy]");
      const svg = galaxy?.querySelector<SVGSVGElement>("svg");
      const nodes = [...document.querySelectorAll<SVGGElement>(".galaxy-node[data-node-id]")];
      const positions = nodes.map((node) => node.getAttribute("transform") ?? "");
      return {
        galaxyWidth: galaxy?.getBoundingClientRect().width ?? 0,
        galaxyHeight: galaxy?.getBoundingClientRect().height ?? 0,
        svgWidth: svg?.getBoundingClientRect().width ?? 0,
        svgHeight: svg?.getBoundingClientRect().height ?? 0,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        positions,
        hasInvalid: positions.some((value) => /NaN|Infinity|undefined/.test(value)),
      };
    });
    expect(metrics.galaxyWidth).toBeGreaterThan(0);
    expect(metrics.galaxyHeight).toBeGreaterThan(0);
    expect(metrics.svgWidth).toBeGreaterThan(0);
    expect(metrics.svgHeight).toBeGreaterThan(0);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
    expect(metrics.hasInvalid).toBe(false);
    expect(new Set(metrics.positions).size).toBeGreaterThan(1);
  }
});
