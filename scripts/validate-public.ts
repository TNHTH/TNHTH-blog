import fs from "node:fs/promises";
import path from "node:path";
import { blockedExtensions, isBlockedPath } from "./policy";
import { getPublicFiles, isMediaFile, isTextFile, scanMediaFiles, scanTextFiles, validatePublicMarkdown, walkFiles } from "./privacy/scan";

const projectRoot = path.resolve(import.meta.dirname, "..");

async function checkFileNames(files: string[]): Promise<void> {
  for (const file of files) {
    const relative = path.relative(projectRoot, file).replaceAll("\\", "/");
    const basename = path.basename(file).toLowerCase();
    if (basename === "publish-allowlist.yml" || basename === "publish-allowlist.yaml") throw new Error(`${relative}: 私有发布清单不能进入公开仓库`);
    if (basename.startsWith(".env") && basename !== ".env.example") throw new Error(`${relative}: 环境文件不能进入公开仓库`);
  }
}

async function validateSnapshot(): Promise<number> {
  const allFiles = await walkFiles(projectRoot);
  const files = await getPublicFiles(projectRoot);
  await checkFileNames(allFiles);
  await scanTextFiles(projectRoot);
  await scanMediaFiles(projectRoot);
  let checked = 0;
  for (const file of files) {
    const relative = path.relative(projectRoot, file).replaceAll("\\", "/");
    const ext = path.extname(file).toLowerCase();
    if (isBlockedPath(relative)) throw new Error(`${relative}: 命中硬禁止路径`);
    if (blockedExtensions.has(ext)) throw new Error(`${relative}: 扩展名不允许进入公开快照`);
    if (!isTextFile(file) && !isMediaFile(file)) throw new Error(`${relative}: 公开快照包含未分类文件`);
    if (relative.startsWith("src/content/") && ext === ".md") validatePublicMarkdown(await fs.readFile(file, "utf8"), relative);
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
