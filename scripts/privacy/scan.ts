import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { assertPublicBody, isBlockedPath, readFrontmatter } from "../policy";

export const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
export const unsupportedMediaExtensions = new Set([".mp4", ".webm"]);
export const textExtensions = new Set([
  ".md", ".mdx", ".json", ".yml", ".yaml", ".ts", ".tsx", ".js", ".mjs", ".astro", ".css", ".html", ".svg", ".txt", ".xml",
]);

const ignoredDirectories = new Set([".git", "node_modules", "dist", ".astro", ".tmp", ".vercel"]);

export function isTextFile(filePath: string): boolean {
  return textExtensions.has(path.extname(filePath).toLowerCase());
}

export function isMediaFile(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  return imageExtensions.has(extension) || unsupportedMediaExtensions.has(extension);
}

export async function walkFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  async function visit(current: string): Promise<void> {
    for (const item of await fs.readdir(current, { withFileTypes: true })) {
      if (ignoredDirectories.has(item.name)) continue;
      const full = path.join(current, item.name);
      if (item.isSymbolicLink()) throw new Error(`${full}: public snapshot 不允许符号链接`);
      if (item.isDirectory()) await visit(full);
      else files.push(full);
    }
  }
  await visit(root);
  return files;
}

export function isPublicPayload(relative: string): boolean {
  return relative.startsWith("src/content/") || relative.startsWith("src/assets/") || relative.startsWith("src/data/generated/") || relative.startsWith("public/") || relative === "src/data/profile.json" || relative === "config/site.ts" || relative === "config/public-repos.yml" || relative === "README.md";
}

function relativePath(root: string, filePath: string): string {
  return path.relative(root, filePath).replaceAll("\\", "/");
}

function assertManifestShape(relative: string, text: string): void {
  if (!relative.endsWith("public-manifest.json") && !relative.endsWith("media-manifest.json")) return;
  const value = JSON.parse(text) as Record<string, unknown>;
  const allowedRoot = new Set(["version", "generatedAt", "entries"]);
  const unknownRoot = Object.keys(value).filter((key) => !allowedRoot.has(key));
  if (unknownRoot.length) throw new Error(`${relative}: manifest 存在未知字段 ${unknownRoot.join(", ")}`);
  if (!Array.isArray(value.entries)) throw new Error(`${relative}: manifest.entries 必须是数组`);
  const allowed = relative.endsWith("media-manifest.json")
    ? new Set(["mediaId", "path", "width", "height", "format", "sha256", "alt", "caption"])
    : new Set(["approvalId", "collection", "slug", "snapshotSha256", "policyVersion"]);
  for (const [index, entry] of value.entries.entries()) {
    if (!entry || typeof entry !== "object") throw new Error(`${relative}: entries[${index}] 无效`);
    const unknown = Object.keys(entry).filter((key) => !allowed.has(key));
    if (unknown.length) throw new Error(`${relative}: entries[${index}] 暴露未知字段 ${unknown.join(", ")}`);
  }
}

export async function getPublicFiles(root: string): Promise<string[]> {
  const files = await walkFiles(root);
  return files.filter((file) => isPublicPayload(relativePath(root, file)));
}

export async function scanTextFiles(root: string): Promise<number> {
  const files = await getPublicFiles(root);
  let checked = 0;
  for (const file of files) {
    const relative = relativePath(root, file);
    if (!isTextFile(file)) continue;
    if (isBlockedPath(relative)) throw new Error(`${relative}: 命中禁止路径`);
    const text = await fs.readFile(file, "utf8");
    assertPublicBody(text, relative);
    assertManifestShape(relative, text);
    checked += 1;
  }
  return checked;
}

export async function scanMediaFiles(root: string): Promise<number> {
  const files = await getPublicFiles(root);
  let checked = 0;
  for (const file of files) {
    const relative = relativePath(root, file);
    const extension = path.extname(file).toLowerCase();
    if (unsupportedMediaExtensions.has(extension)) throw new Error(`${relative}: 视频媒体尚未接入可验证的元数据扫描器`);
    if (!imageExtensions.has(extension)) continue;
    const metadata = await sharp(file).metadata();
    if (metadata.exif || metadata.iptc || metadata.xmp || metadata.tifftagPhotoshop) throw new Error(`${relative}: derivative 仍包含 EXIF/IPTC/XMP 元数据`);
    checked += 1;
  }
  return checked;
}

export function validatePublicMarkdown(text: string, relative: string): void {
  const { data, body } = readFrontmatter(text);
  if (data.publish !== undefined || data.visibility !== undefined) throw new Error(`${relative}: 公开快照不得保留内部发布标记`);
  if (!data.title || !data.summary || !data.date || !data.type) throw new Error(`${relative}: frontmatter 不完整`);
  if (data.type === "project" && (!data.role || !data.contribution || !data.status)) throw new Error(`${relative}: Work 快照缺少角色、贡献或状态`);
  assertPublicBody(body, relative);
}
