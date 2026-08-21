import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
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
    return relative.startsWith("src/content/") || relative.startsWith("src/assets/") || relative.startsWith("src/data/generated/") || relative.startsWith("public/") || relative === "src/data/profile.json" || relative === "config/site.ts" || relative === "README.md";
  });
  let checked = 0;
  const projectIds = new Set<string>();
  const noteRelationships: Array<{ file: string; relatedProjects: unknown }> = [];
  const isRasterImage = (ext: string): boolean => [".png", ".webp", ".jpg", ".jpeg", ".gif"].includes(ext);
  for (const file of payload) {
    const relative = path.relative(projectRoot, file).replaceAll("\\", "/");
    const ext = path.extname(file).toLowerCase();
    if (isBlockedPath(relative)) throw new Error(`${relative}: 命中硬禁止路径`);
    if (blockedExtensions.has(ext)) throw new Error(`${relative}: 扩展名不允许进入公开快照`);
    if (isRasterImage(ext)) {
      const metadata = await sharp(file).metadata();
      if (!metadata.width || !metadata.height) throw new Error(`${relative}: 无法解码为有效图片`);
      if (metadata.exif || metadata.xmp || metadata.iptc || metadata.tifftagPhotoshop) throw new Error(`${relative}: 图片仍包含 EXIF/XMP/IPTC 元数据`);
      checked += 1;
      continue;
    }
    const text = await fs.readFile(file, "utf8");
    assertPublicBody(text, relative);
    if (relative.startsWith("src/content/") && ext === ".md") {
      const { data, body } = readFrontmatter(text);
      if (data.publish !== undefined || data.visibility !== undefined) throw new Error(`${relative}: 公开快照不得保留内部发布标记`);
      if (relative.startsWith("src/content/projects/")) {
        if (!data.title || !data.summary || !data.outcome || !data.status || !data.period) throw new Error(`${relative}: Project frontmatter 不完整`);
        projectIds.add(path.basename(relative, ".md"));
      } else if (relative.startsWith("src/content/notes/")) {
        if (!data.title || !data.date) throw new Error(`${relative}: Note frontmatter 不完整`);
        noteRelationships.push({ file: relative, relatedProjects: data.relatedProjects });
      }
      assertPublicBody(body, relative);
    }
    checked += 1;
  }
  for (const relationship of noteRelationships) {
    if (relationship.relatedProjects === undefined) continue;
    if (!Array.isArray(relationship.relatedProjects)) throw new Error(`${relationship.file}: relatedProjects 必须是数组`);
    for (const projectId of relationship.relatedProjects) if (typeof projectId !== "string" || !projectIds.has(projectId)) throw new Error(`${relationship.file}: relatedProjects 指向不存在的 project ${String(projectId)}`);
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
