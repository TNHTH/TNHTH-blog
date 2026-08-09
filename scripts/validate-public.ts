import fs from "node:fs/promises";
import path from "node:path";
import { blockedExtensions, assertPublicBody, isBlockedPath, readFrontmatter } from "./policy";

const projectRoot = path.resolve(import.meta.dirname, "..");

async function walk(root: string): Promise<string[]> {
  const result: string[] = [];
  const visit = async (current: string) => {
    for (const item of await fs.readdir(current, { withFileTypes: true })) {
      if ([".git", "node_modules", "dist", ".astro", ".tmp"].includes(item.name)) continue;
      const full = path.join(current, item.name);
      if (item.isDirectory()) await visit(full);
      else result.push(full);
    }
  };
  await visit(root);
  return result;
}

async function checkFileNames(files: string[]): Promise<void> {
  for (const file of files) {
    const relative = path.relative(projectRoot, file).replaceAll("\\", "/");
    const basename = path.basename(file).toLowerCase();
    if (basename === "publish-allowlist.yml" || basename === "publish-allowlist.yaml") throw new Error(`${relative}: 私有发布清单不能进入公开仓库`);
    if (basename.startsWith(".env") && basename !== ".env.example") throw new Error(`${relative}: 环境文件不能进入公开仓库`);
  }
}

async function validateSnapshot(): Promise<number> {
  const files = await walk(projectRoot);
  await checkFileNames(files);
  const payload = files.filter((file) => {
    const relative = path.relative(projectRoot, file).replaceAll("\\", "/");
    return relative.startsWith("src/content/") || relative.startsWith("src/assets/") || relative.startsWith("src/data/generated/") || relative.startsWith("public/") || relative === "src/data/profile.json" || relative === "config/site.ts" || relative === "config/public-repos.yml" || relative === "README.md";
  });
  let checked = 0;
  for (const file of payload) {
    const relative = path.relative(projectRoot, file).replaceAll("\\", "/");
    const ext = path.extname(file).toLowerCase();
    if (isBlockedPath(relative)) throw new Error(`${relative}: 命中硬禁止路径`);
    if (blockedExtensions.has(ext)) throw new Error(`${relative}: 扩展名不允许进入公开快照`);
    const text = await fs.readFile(file, "utf8");
    assertPublicBody(text, relative);
    if (relative.startsWith("src/content/") && ext === ".md") {
      const { data, body } = readFrontmatter(text);
      if (data.publish !== undefined || data.visibility !== undefined) throw new Error(`${relative}: 公开快照不得保留内部发布标记`);
      if (!data.title || !data.summary || !data.date || !data.type) throw new Error(`${relative}: 公开快照 frontmatter 不完整`);
      if (data.type === "project" && (!data.role || !data.contribution || !data.status)) throw new Error(`${relative}: Work 快照缺少贡献边界或状态`);
      assertPublicBody(body, relative);
    }
    checked += 1;
  }
  console.log(`public snapshot verified: ${checked} files`);
  return checked;
}

if (process.argv.includes("--snapshot")) {
  validateSnapshot().catch((error) => { console.error(`PUBLIC AUDIT FAILED: ${error.message}`); process.exitCode = 1; });
} else {
  console.log("Use --snapshot to audit the generated public snapshot.");
}

export { validateSnapshot };
