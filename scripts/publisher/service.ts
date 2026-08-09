import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { stringify } from "yaml";
import { assertPublicBody, assertPublicFrontmatter, blockedExtensions, isInside, readFrontmatter, sha256File } from "../policy";
import { parsePolicy, serializePolicy } from "./allowlist";
import { writePublicManifest } from "./manifest";
import { resolveVaultSource } from "./paths";
import { replaceContentAndAssets } from "./transaction";
import type { PublisherEntry, PublisherPolicy } from "./types";

export interface PublisherPaths {
  repoRoot: string;
  vaultRoot: string;
  policyPath: string;
}

export function approvalId(collection: string, slug: string, sourceSha256: string): string {
  return `PUB-${crypto.createHash("sha256").update(`${collection}:${slug}:${sourceSha256}`).digest("hex").slice(0, 16).toUpperCase()}`;
}

export async function readPublisherPolicy(policyPath: string): Promise<PublisherPolicy> {
  return parsePolicy(await fs.readFile(policyPath, "utf8"));
}

export async function writePublisherPolicy(policyPath: string, policy: PublisherPolicy): Promise<void> {
  await fs.writeFile(policyPath, serializePolicy(policy), "utf8");
}

export async function approve(paths: PublisherPaths, source: string, collection: PublisherEntry["collection"], slug: string): Promise<PublisherEntry> {
  const sourcePath = await resolveVaultSource(paths.vaultRoot, source);
  const sourceSha256 = await sha256File(sourcePath);
  const policy = await readPublisherPolicy(paths.policyPath);
  if (policy.entries.some((entry) => entry.collection === collection && entry.slug === slug)) throw new Error(`collection/slug already approved: ${collection}:${slug}`);
  const entry: PublisherEntry = {
    approvalId: approvalId(collection, slug, sourceSha256),
    source,
    collection,
    slug,
    sourceSha256,
    reviewedAt: new Date().toISOString(),
    assets: [],
  };
  const next = { version: 2 as const, entries: [...policy.entries, entry] };
  parsePolicy(serializePolicy(next));
  await writePublisherPolicy(paths.policyPath, next);
  return entry;
}

async function stageEntry(entry: PublisherEntry, paths: PublisherPaths, stageRoot: string): Promise<void> {
  if (entry.revokedAt) return;
  const sourcePath = await resolveVaultSource(paths.vaultRoot, entry.source);
  if (path.extname(sourcePath).toLowerCase() !== ".md") throw new Error(`${entry.source}: only Markdown is publishable`);
  if ((await sha256File(sourcePath)) !== entry.sourceSha256) throw new Error(`${entry.source}: source hash mismatch`);
  const raw = await fs.readFile(sourcePath, "utf8");
  const { data, body } = readFrontmatter(raw);
  assertPublicFrontmatter(data, { source: entry.source, collection: entry.collection, slug: entry.slug, sha256: entry.sourceSha256 });
  assertPublicBody(body, entry.source);
  const contentPath = path.join(stageRoot, "src", "content", entry.collection, `${entry.slug}.md`);
  await fs.mkdir(path.dirname(contentPath), { recursive: true });
  const safeData = Object.fromEntries(["title", "summary", "date", "updated", "tags", "type", "status", "role", "contribution", "evidence", "repo", "featured", "category", "cover"].filter((key) => data[key] !== undefined).map((key) => [key, data[key]]));
  await fs.writeFile(contentPath, `---\n${stringify(safeData)}---\n\n${body.trim()}\n`, "utf8");
  for (const asset of entry.assets) {
    const assetPath = await resolveVaultSource(paths.vaultRoot, asset.source);
    const extension = path.extname(assetPath).toLowerCase();
    if (blockedExtensions.has(extension) || !new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"]).has(extension)) throw new Error(`${asset.source}: unsupported asset`);
    if ((await sha256File(assetPath)) !== asset.sourceSha256) throw new Error(`${asset.source}: asset hash mismatch`);
    const destination = path.join(stageRoot, "src", "assets", entry.slug, `${asset.mediaId}${extension}`);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(assetPath, destination);
  }
}

export async function sync(paths: PublisherPaths, options: { failAt?: "content" | "assets" } = {}): Promise<void> {
  const policy = await readPublisherPolicy(paths.policyPath);
  if (!policy.entries.length) throw new Error("publisher policy cannot be empty");
  const stageRoot = path.join(paths.repoRoot, ".tmp", "publisher-stage");
  await fs.rm(stageRoot, { recursive: true, force: true });
  await fs.mkdir(stageRoot, { recursive: true });
  for (const entry of policy.entries) await stageEntry(entry, paths, stageRoot);
  const stagedContent = path.join(stageRoot, "src", "content");
  const stagedAssets = path.join(stageRoot, "src", "assets");
  await fs.mkdir(stagedContent, { recursive: true });
  await fs.mkdir(stagedAssets, { recursive: true });
  await writePublicManifest(stageRoot, policy, stagedContent);
  await replaceContentAndAssets({
    stagedContent,
    stagedAssets,
    contentDestination: path.join(paths.repoRoot, "src", "content"),
    assetsDestination: path.join(paths.repoRoot, "src", "assets"),
    failAt: options.failAt,
  });
  const stagedManifest = path.join(stageRoot, "src", "data", "generated", "public-manifest.json");
  const manifestDestination = path.join(paths.repoRoot, "src", "data", "generated", "public-manifest.json");
  await fs.mkdir(path.dirname(manifestDestination), { recursive: true });
  await fs.copyFile(stagedManifest, manifestDestination);
  await fs.rm(stageRoot, { recursive: true, force: true });
}

export async function revoke(paths: PublisherPaths, approval: string, reason: string): Promise<void> {
  const policy = await readPublisherPolicy(paths.policyPath);
  const index = policy.entries.findIndex((entry) => entry.approvalId === approval);
  if (index < 0) throw new Error(`unknown approvalId: ${approval}`);
  if (!reason.trim()) throw new Error("revoke reason is required");
  const entries = policy.entries.slice();
  entries[index] = { ...entries[index], revokedAt: new Date().toISOString(), revokeReason: reason.trim() };
  await writePublisherPolicy(paths.policyPath, { version: 2, entries });
}

export async function verify(paths: PublisherPaths): Promise<void> {
  const policy = await readPublisherPolicy(paths.policyPath);
  const contentRoot = path.join(paths.repoRoot, "src", "content");
  for (const entry of policy.entries) {
    if (entry.revokedAt) continue;
    const output = path.join(contentRoot, entry.collection, `${entry.slug}.md`);
    if (!isInside(contentRoot, output)) throw new Error(`${entry.slug}: output path escape`);
    await fs.access(output);
  }
  const { validateSnapshot } = await import("../validate-public");
  await validateSnapshot();
}
