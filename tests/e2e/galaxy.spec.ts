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
const interactiveLabelSelector = ".galaxy-node-project text, .galaxy-node-topic text, .galaxy-node-note text";

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

test("mobile quiet mode hides every interactive label", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  const opacities = await page.locator(interactiveLabelSelector).evaluateAll((elements) => elements.map((element) => Number(getComputedStyle(element).opacity)));

  expect(opacities.length).toBeGreaterThan(0);
  expect(opacities.every((opacity) => opacity === 0)).toBe(true);
});

test("desktop quiet mode hides every interactive label", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  const opacities = await page.locator(interactiveLabelSelector).evaluateAll((elements) => elements.map((element) => Number(getComputedStyle(element).opacity)));

  expect(opacities.length).toBeGreaterThan(0);
  expect(opacities.every((opacity) => opacity === 0)).toBe(true);
});

test("active project is the only interactive label that becomes visible", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const project = page.locator(".galaxy-node-project[data-node-id]").first();
  const activeId = await project.getAttribute("data-node-id");
  await project.dispatchEvent("pointerenter");
  await expect.poll(async () => project.locator("text").evaluate((element) => Number(getComputedStyle(element).opacity))).toBeCloseTo(.98, 2);

  const labels = await page.locator(interactiveLabelSelector).evaluateAll((elements) => elements.map((element) => ({
    id: element.closest<SVGGElement>(".galaxy-node")?.dataset.nodeId ?? "",
    opacity: Number(getComputedStyle(element).opacity),
  })));
  const active = labels.find((label) => label.id === activeId);

  expect(active?.opacity).toBeCloseTo(.98, 2);
  expect(labels.filter((label) => label.id !== activeId).every((label) => label.opacity === 0)).toBe(true);
});

test("active labels use outward placement and stay inside the SVG viewBox", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const labels = await page.locator(".galaxy-node-project[data-node-id]").evaluateAll((elements) => elements.map((element) => {
    const text = element.querySelector<SVGTextElement>("text");
    const box = text?.getBBox();
    const x = Number(element.getAttribute("data-node-x"));
    const y = Number(element.getAttribute("data-node-y"));
    return {
      nodeX: x,
      anchor: text?.getAttribute("text-anchor"),
      left: box ? x + box.x : NaN,
      right: box ? x + box.x + box.width : NaN,
      top: box ? y + box.y : NaN,
      bottom: box ? y + box.y + box.height : NaN,
    };
  }));

  expect(labels.length).toBeGreaterThan(0);
  for (const label of labels) {
    expect(label.left).toBeGreaterThanOrEqual(1);
    expect(label.right).toBeLessThanOrEqual(99);
    expect(label.top).toBeGreaterThanOrEqual(1);
    expect(label.bottom).toBeLessThanOrEqual(99);
    if (label.nodeX < 64) expect(label.anchor).toBe("end");
  }
});

test("active project labels do not collide with the center safe area", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const projects = page.locator(".galaxy-node-project[data-node-id]");

  for (let index = 0; index < await projects.count(); index += 1) {
    await projects.nth(index).dispatchEvent("pointerenter");
    const collision = await page.evaluate(() => {
      const toGraphBox = (element: SVGGElement, selector: string) => {
        const child = element.querySelector<SVGGraphicsElement>(selector);
        if (!child) return null;
        const box = child.getBBox();
        const x = Number(element.dataset.nodeX);
        const y = Number(element.dataset.nodeY);
        return { left: x + box.x, right: x + box.x + box.width, top: y + box.y, bottom: y + box.y + box.height };
      };
      const overlaps = (a: NonNullable<ReturnType<typeof toGraphBox>>, b: NonNullable<ReturnType<typeof toGraphBox>>) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const active = document.querySelector<SVGGElement>('.galaxy-node-project.is-active');
      const center = document.querySelector<SVGGElement>('.galaxy-node-center');
      const activeBox = active ? toGraphBox(active, "text") : null;
      const centerCircle = center ? toGraphBox(center, "circle:not(.galaxy-center-ring)") : null;
      const centerText = center ? toGraphBox(center, "text") : null;
      if (!activeBox || !centerCircle) return true;
      const paddedCircle = { left: centerCircle.left - 2, right: centerCircle.right + 2, top: centerCircle.top - 2, bottom: centerCircle.bottom + 2 };
      return !overlaps(activeBox, paddedCircle) && (!centerText || !overlaps(activeBox, centerText));
    });

    expect(collision).toBe(true);
  }
});

test("Galaxy keeps its accessible name without a native SVG title tooltip", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const svg = page.locator("[data-galaxy] svg");

  await expect(svg.locator(":scope > title")).toHaveCount(0);
  await expect(svg).toHaveAttribute("aria-label", "内容关系图");
  await expect(svg).toHaveAttribute("aria-describedby", "galaxy-desc");
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
