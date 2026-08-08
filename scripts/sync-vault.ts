import fs from "node:fs/promises";
import path from "node:path";
import { stringify } from "yaml";
import {
  assertPublicBody,
  assertPublicFrontmatter,
  blockedExtensions,
  isBlockedPath,
  isInside,
  loadAllowList,
  normalizeRelative,
  publicFrontmatter,
  readFrontmatter,
  sha256File,
  type AllowEntry,
} from "./policy";

const repoRoot = path.resolve(import.meta.dirname, "..");
const vaultRootInput = process.env.VAULT_ROOT;
if (!vaultRootInput) throw new Error("VAULT_ROOT must point to the private vault when syncing content");
const vaultRoot = path.resolve(vaultRootInput);
const policyPath = path.resolve(process.env.PUBLISH_POLICY || path.join(vaultRoot, "90_系统", "个人网站发布配置", "publish-allowlist.yml"));
const stagingRoot = path.join(repoRoot, ".tmp", "public-snapshot");

function outputFile(entry: AllowEntry): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(entry.slug)) throw new Error(`${entry.source}: slug 只允许小写字母、数字和连字符`);
  return path.join(stagingRoot, "src", "content", entry.collection, `${entry.slug}.md`);
}

async function sourcePath(relative: string): Promise<string> {
  const normalized = normalizeRelative(relative);
  if (normalized.startsWith("../") || isBlockedPath(normalized)) throw new Error(`${relative}: 命中硬禁止路径`);
  const full = path.resolve(vaultRoot, normalized);
  if (!isInside(vaultRoot, full)) throw new Error(`${relative}: 路径逃逸`);
  const [realVault, realFull] = await Promise.all([fs.realpath(vaultRoot), fs.realpath(full)]);
  if (!isInside(realVault, realFull)) throw new Error(`${relative}: 符号链接逃逸`);
  return full;
}

async function replaceDirectoryAtomically(staged: string, destination: string): Promise<void> {
  const backup = `${destination}.previous-${process.pid}`;
  await fs.rm(backup, { recursive: true, force: true });
  let movedExisting = false;
  try {
    await fs.rename(destination, backup);
    movedExisting = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try {
    await fs.rename(staged, destination);
    await fs.rm(backup, { recursive: true, force: true });
  } catch (error) {
    await fs.rm(destination, { recursive: true, force: true });
    if (movedExisting) await fs.rename(backup, destination);
    throw error;
  }
}

async function copyApprovedAsset(entry: AllowEntry, asset: { source: string; sha256: string }, targetRoot: string): Promise<void> {
  const source = await sourcePath(asset.source);
  const extension = path.extname(source).toLowerCase();
  const allowed = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".mp4", ".webm"]);
  if (!allowed.has(extension) || blockedExtensions.has(extension)) throw new Error(`${entry.source}: 附件扩展名不允许: ${asset.source}`);
  if ((await sha256File(source)) !== asset.sha256) throw new Error(`${asset.source}: 附件哈希不匹配`);
  const destination = path.join(targetRoot, "src", "assets", entry.slug, path.basename(source));
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}

async function syncEntry(entry: AllowEntry): Promise<void> {
  const source = await sourcePath(entry.source);
  if (path.extname(source).toLowerCase() !== ".md") throw new Error(`${entry.source}: 只允许 Markdown 源文档`);
  if ((await sha256File(source)) !== entry.sha256) throw new Error(`${entry.source}: 正文哈希不匹配，请重新审核`);
  const raw = await fs.readFile(source, "utf8");
  const { data, body } = readFrontmatter(raw);
  assertPublicFrontmatter(data, entry);
  assertPublicBody(body, entry.source);
  const destination = outputFile(entry);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const safeData = publicFrontmatter(data);
  await fs.writeFile(destination, `---\n${stringify(safeData)}---\n\n${body.trim()}\n`, "utf8");
  for (const asset of entry.assets ?? []) await copyApprovedAsset(entry, asset, stagingRoot);
}

async function main(): Promise<void> {
  const policyText = await fs.readFile(policyPath, "utf8");
  const policy = loadAllowList(policyText);
  if (!policy.entries.length) throw new Error("发布清单为空，拒绝生成空快照");
  await fs.rm(stagingRoot, { recursive: true, force: true });
  await fs.mkdir(stagingRoot, { recursive: true });
  for (const entry of policy.entries) await syncEntry(entry);
  const generated = path.join(stagingRoot, "src", "content");
  const destination = path.join(repoRoot, "src", "content");
  await replaceDirectoryAtomically(generated, destination);
  const stagedAssets = path.join(stagingRoot, "src", "assets");
  const assets = path.join(repoRoot, "src", "assets");
  await fs.mkdir(stagedAssets, { recursive: true });
  await replaceDirectoryAtomically(stagedAssets, assets);
  await fs.rm(stagingRoot, { recursive: true, force: true });
  console.log(`public snapshot generated: ${policy.entries.length} entries`);
}

main().catch((error) => { console.error(`SYNC FAILED: ${error.message}`); process.exitCode = 1; });
