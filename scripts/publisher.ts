import fs from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "yaml";
import sharp from "sharp";
import { assertPublicBody, readFrontmatter } from "./policy";
import { assertHumanAllowlist, assertManifest, assertProposal, isHumanApproved, publicCollection, publisherVersion, stableHash, type HumanApproval, type ProposalEntry, type ProposalMedia, type PublishManifest } from "../src/lib/publisher";

const repoRoot = path.resolve(import.meta.dirname, "..");
const vaultRoot = process.env.VAULT_ROOT ? path.resolve(process.env.VAULT_ROOT) : null;
const defaultAllowlist = process.env.PUBLISH_ALLOWLIST ?? process.env.PUBLISH_POLICY ?? (vaultRoot ? path.join(vaultRoot, "90_系统", "个人网站发布配置", "publish-allowlist.yml") : "");
const tempRoot = path.join(repoRoot, ".tmp", "codex", new Date().toISOString().slice(0, 10));

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requireVault(): string {
  if (!vaultRoot) throw new Error("VAULT_ROOT must point to the private vault");
  return vaultRoot;
}

function inside(root: string, candidate: string): boolean {
  const base = path.resolve(root);
  const target = path.resolve(candidate);
  return target.startsWith(`${base}${path.sep}`) || target === base;
}

async function sourceFile(relative: string): Promise<string> {
  const root = requireVault();
  const full = path.resolve(root, relative);
  if (!inside(root, full)) throw new Error(`${relative}: source path escaped vault`);
  const [realRoot, realFull] = await Promise.all([fs.realpath(root), fs.realpath(full)]);
  if (!inside(realRoot, realFull)) throw new Error(`${relative}: symlink escaped vault`);
  return full;
}

async function repoFile(relative: string): Promise<string> {
  const full = path.resolve(repoRoot, relative);
  if (!inside(repoRoot, full)) throw new Error(`${relative}: public draft path escaped repository`);
  const [realRoot, realFull] = await Promise.all([fs.realpath(repoRoot), fs.realpath(full)]);
  if (!inside(realRoot, realFull)) throw new Error(`${relative}: symlink escaped repository`);
  return full;
}

async function readAllowlist(file: string): Promise<HumanApproval[]> {
  if (!file) throw new Error("PUBLISH_ALLOWLIST must point to the human-controlled allowlist");
  const value = parse(await fs.readFile(file, "utf8")) as { entries?: unknown[] };
  if (!value || !Array.isArray(value.entries)) throw new Error("allowlist must contain an entries array");
  assertHumanAllowlist(value.entries);
  return value.entries;
}

async function readProposal(file: string): Promise<PublishManifest> {
  const manifest = JSON.parse(await fs.readFile(file, "utf8")) as PublishManifest;
  assertManifest(manifest);
  return manifest;
}

function publicFrontmatter(data: Record<string, unknown>, collection: ProposalEntry["collection"]): Record<string, unknown> {
  const allowed = collection === "projects"
    ? ["title", "summary", "outcome", "status", "period", "topics", "updated", "featured", "priority", "role", "evidence", "contributions", "tech", "repo", "demo"]
    : ["title", "date", "updated", "summary", "tags", "source", "relatedProjects", "series", "location", "equipment", "weather", "course", "externalLinks"];
  return Object.fromEntries(allowed.filter((key) => data[key] !== undefined).map((key) => [key, data[key]]));
}

function assertV3Frontmatter(data: Record<string, unknown>, collection: ProposalEntry["collection"], label: string): void {
  const required = collection === "projects" ? ["title", "summary", "outcome", "status", "period"] : ["title", "date"];
  for (const key of required) if (!data[key]) throw new Error(`${label}: missing ${key}`);
  if (data.approved !== undefined) throw new Error(`${label}: internal approval flag is not accepted`);
  if (data.publish !== undefined && data.publish !== true) throw new Error(`${label}: publish must be true when present`);
  if (data.visibility !== undefined && data.visibility !== "public") throw new Error(`${label}: visibility must be public when present`);
}

async function hashFile(file: string): Promise<string> {
  return stableHash(await fs.readFile(file));
}

function serializedFrontmatter(data: Record<string, unknown>, body: string): string {
  return `---\n${stringify(data)}---\n\n${body.trim()}\n`;
}

async function sanitizeMedia(entry: ProposalEntry, media: ProposalMedia, outputRoot: string, markdownPath: string): Promise<string> {
  const source = await sourceFile(media.source);
  if (await hashFile(source) !== media.sha256) throw new Error(`${media.source}: media hash mismatch`);
  const outputName = `${entry.slug}-${media.sha256.slice(0, 12)}.webp`;
  const output = path.join(outputRoot, "src", "assets", entry.slug, outputName);
  await fs.mkdir(path.dirname(output), { recursive: true });
  // Quality raised from the original 82 to 92: this file now also gets a second,
  // delivery-focused optimization pass by Astro's <Image> (Task 5), so this layer's
  // job is "produce a high-quality, privacy-safe master," not final network
  // compression — compressing aggressively twice loses more than either pass alone.
  await sharp(source).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 92 }).toFile(output);
  const metadata = await sharp(output).metadata();
  if (metadata.exif || metadata.xmp || metadata.iptc || metadata.tifftagPhotoshop) throw new Error(`${media.source}: sanitized output still contains EXIF/GPS/XMP/IPTC metadata`);
  return path.relative(path.dirname(markdownPath), output).replaceAll("\\", "/");
}

async function resolveEvidenceMediaRefs(publicData: Record<string, unknown>, entry: ProposalEntry, stagingRoot: string, markdownPath: string): Promise<void> {
  if (entry.collection !== "projects") return;

  const evidence = Array.isArray(publicData.evidence) ? publicData.evidence : [];

  // Private draft contract: image evidence must use mediaRef, never a hand-written
  // src — src only ever exists in Publisher's own output. Enforced up front, before
  // touching the filesystem, so a malformed draft is rejected here instead of an
  // unsanitized path silently passing through untouched (no Sharp EXIF strip, no
  // hash verification) because nothing downstream ever looked at a plain src.
  for (const item of evidence) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (record.kind === "image") {
      if ("src" in record) throw new Error(`${entry.id}: private image evidence must use mediaRef, not src`);
      if (typeof record.mediaRef !== "string" || !record.mediaRef) throw new Error(`${entry.id}: private image evidence requires mediaRef`);
    } else if ("mediaRef" in record) {
      throw new Error(`${entry.id}: mediaRef is only allowed on kind: image evidence`);
    }
  }

  const assetDir = path.join(stagingRoot, "src", "assets", entry.slug);
  await fs.rm(assetDir, { recursive: true, force: true });
  await fs.mkdir(assetDir, { recursive: true });

  const mediaById = new Map((entry.media ?? []).map((media) => [media.id, media]));
  const resolvedCache = new Map<string, string>();
  const usedMediaIds = new Set<string>();

  for (const item of evidence) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (!("mediaRef" in record)) continue;
    const mediaRef = record.mediaRef as string;
    const media = mediaById.get(mediaRef);
    if (!media) throw new Error(`${entry.id}: evidence.mediaRef "${mediaRef}" has no matching entry in media[]`);
    usedMediaIds.add(mediaRef);
    let relativeSrc = resolvedCache.get(mediaRef);
    if (!relativeSrc) {
      relativeSrc = await sanitizeMedia(entry, media, stagingRoot, markdownPath);
      resolvedCache.set(mediaRef, relativeSrc);
    }
    record.src = relativeSrc;
    delete record.mediaRef;
  }

  // Runs unconditionally, independent of whether evidence was even an array —
  // approving media and then silently failing to reference it must fail loudly
  // whether the omission is "no mediaRef anywhere" or "no evidence array at all."
  for (const media of entry.media ?? []) {
    if (!usedMediaIds.has(media.id)) throw new Error(`${entry.id}: approved media "${media.id}" is not referenced by any evidence entry`);
  }
}

async function stageEntry(entry: ProposalEntry, stagingRoot: string, approvals: HumanApproval[]): Promise<void> {
  assertProposal(entry);
  if (!isHumanApproved(entry, approvals)) throw new Error(`${entry.id}: source and hash are not approved by the human allowlist`);
  const source = await sourceFile(entry.source);
  if (await hashFile(source) !== entry.sourceSha256) throw new Error(`${entry.source}: source hash changed after review`);
  const raw = await fs.readFile(entry.publicSource ? await repoFile(entry.publicSource) : source, "utf8");
  if (entry.publicSource && await hashFile(await repoFile(entry.publicSource)) !== entry.publicSha256) throw new Error(`${entry.publicSource}: public draft hash changed after review`);
  const { data, body } = readFrontmatter(raw);
  assertV3Frontmatter(data, entry.collection, entry.source);
  assertPublicBody(body, entry.source);
  const publicData = publicFrontmatter(data, entry.collection);
  assertPublicBody(JSON.stringify(publicData), entry.source);
  const target = path.join(stagingRoot, "src", "content", entry.collection, `${entry.slug}.md`);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await resolveEvidenceMediaRefs(publicData, entry, stagingRoot, target);
  await fs.writeFile(target, serializedFrontmatter(publicData, body), "utf8");
}

async function validateStaging(stagingRoot: string): Promise<void> {
  const contentRoot = path.join(stagingRoot, "src", "content");
  const collections = await fs.readdir(contentRoot, { withFileTypes: true });
  for (const collection of collections) {
    if (!collection.isDirectory()) continue;
    const files = await fs.readdir(path.join(contentRoot, collection.name));
    for (const file of files.filter((name) => name.endsWith(".md"))) {
      const full = path.join(contentRoot, collection.name, file);
      const raw = await fs.readFile(full, "utf8");
      const { body } = readFrontmatter(raw);
      assertPublicBody(raw, path.relative(stagingRoot, full));
      assertPublicBody(body, path.relative(stagingRoot, full));
    }
  }
}

async function atomicReplace(staged: string, destination: string): Promise<void> {
  const backup = `${destination}.previous-${process.pid}`;
  await fs.rm(backup, { recursive: true, force: true });

  const isWindowsRenameIssue = (error: unknown): boolean => {
    const code = (error as NodeJS.ErrnoException).code;
    return process.platform === "win32" && (code === "EPERM" || code === "EEXIST" || code === "ENOTEMPTY");
  };

  const copyReplace = async (): Promise<void> => {
    await fs.cp(destination, backup, { recursive: true, force: true, errorOnExist: false });
    try {
      // Windows can keep a directory handle open even when its files are writable.
      // The staging tree is the full desired final state, so replace destination
      // outright (not merge-copy over it) before copying staged in, or files that
      // exist in destination but not in staged would survive the "replace".
      await fs.rm(destination, { recursive: true, force: true });
      await fs.cp(staged, destination, { recursive: true, force: true, errorOnExist: false });
      await fs.rm(backup, { recursive: true, force: true });
    } catch (error) {
      await fs.rm(destination, { recursive: true, force: true });
      await fs.cp(backup, destination, { recursive: true, force: true, errorOnExist: false });
      await fs.rm(backup, { recursive: true, force: true });
      throw error;
    }
  };

  let moved = false;
  try {
    await fs.rename(destination, backup);
    moved = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // The destination does not exist; the normal rename below remains atomic.
    } else if (isWindowsRenameIssue(error)) {
      await copyReplace();
      return;
    } else {
      throw error;
    }
  }
  try {
    await fs.rename(staged, destination);
    await fs.rm(backup, { recursive: true, force: true });
  } catch (error) {
    if (isWindowsRenameIssue(error) && !moved) {
      await copyReplace();
      return;
    }
    await fs.rm(destination, { recursive: true, force: true });
    if (moved) await fs.rename(backup, destination);
    throw error;
  }
}

async function prepare(): Promise<void> {
  if (!process.argv.includes("--dry-run")) throw new Error("prepare requires --dry-run; it never approves content");
  const root = requireVault();
  const policyPath = argument("--allowlist") ?? defaultAllowlist;
  const value = parse(await fs.readFile(policyPath, "utf8")) as { entries?: Array<{ source: string; sha256?: string; sourceSha256?: string; publicSource?: string; publicSha256?: string; collection: string; slug: string; assets?: Array<{ id: string; source: string; sha256: string }> }> };
  if (!value.entries?.length) throw new Error("allowlist/proposal has no entries");
  const entries: ProposalEntry[] = [];
  for (const item of value.entries) {
    const source = path.resolve(root, item.source);
    if (!inside(root, source)) throw new Error(`${item.source}: source path escaped vault`);
    const sourceSha256 = item.sourceSha256 ?? item.sha256;
    if (!sourceSha256) throw new Error(`${item.source}: source hash missing`);
    const collection = publicCollection(item.collection);
    entries.push({ id: `${collection}/${item.slug}`, source: item.source.replaceAll("\\", "/"), sourceSha256, publicSource: item.publicSource?.replaceAll("\\", "/"), publicSha256: item.publicSha256, collection, slug: item.slug, media: item.assets });
  }
  const manifest: PublishManifest = { version: 2, mode: "proposal", generatedAt: new Date().toISOString(), toolVersion: publisherVersion, entries };
  entries.forEach(assertProposal);
  const output = argument("--out") ?? path.join(tempRoot, "review-manifest.json");
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`proposal manifest written: ${output}`);
}

async function applyManifest(): Promise<void> {
  const manifest = await readProposal(argument("--manifest") ?? "");
  const approvals = await readAllowlist(argument("--allowlist") ?? defaultAllowlist);
  const stagingRoot = path.join(repoRoot, ".tmp", "publisher-staging", `${process.pid}-${Date.now()}`);
  await fs.rm(stagingRoot, { recursive: true, force: true });
  await fs.mkdir(stagingRoot, { recursive: true });
  try {
    await fs.cp(path.join(repoRoot, "src"), path.join(stagingRoot, "src"), { recursive: true });
    await fs.mkdir(path.join(stagingRoot, "src", "content"), { recursive: true });
    await fs.mkdir(path.join(stagingRoot, "src", "assets"), { recursive: true });
    for (const entry of manifest.entries) await stageEntry(entry, stagingRoot, approvals);
    await validateStaging(stagingRoot);
    await atomicReplace(path.join(stagingRoot, "src"), path.join(repoRoot, "src"));
    const manifestHash = stableHash(JSON.stringify(manifest));
    await fs.mkdir(tempRoot, { recursive: true });
    await fs.writeFile(path.join(tempRoot, "publisher-apply-manifest.json"), `${JSON.stringify({ ...manifest, manifestHash, appliedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
    console.log(`publisher applied ${manifest.entries.length} entries; manifest hash ${manifestHash}`);
  } finally {
    await fs.rm(stagingRoot, { recursive: true, force: true });
  }
}

async function revoke(): Promise<void> {
  if (!process.argv.includes("--confirm")) throw new Error("revoke requires --confirm because it removes public files");
  const entry = argument("--entry");
  if (!entry || !/^(projects|notes)\/[a-z0-9][a-z0-9-]*$/.test(entry)) throw new Error("revoke requires --entry projects/<slug> or notes/<slug>");
  const [collection, slug] = entry.split("/");
  const content = path.join(repoRoot, "src", "content", collection, `${slug}.md`);
  const media = path.join(repoRoot, "src", "assets", slug);
  await fs.rm(content, { force: true });
  await fs.rm(media, { recursive: true, force: true });
  await fs.mkdir(tempRoot, { recursive: true });
  await fs.appendFile(path.join(tempRoot, "revoke.log.jsonl"), `${JSON.stringify({ entry, revokedAt: new Date().toISOString(), note: "GitHub/Vercel/CDN deploy and purge remain explicit follow-up steps" })}\n`, "utf8");
  console.log(`revoked ${entry}; run pnpm build before deploying the removal`);
}

const command = process.argv[2];
if (command === "prepare") await prepare();
else if (command === "apply") await applyManifest();
else if (command === "revoke") await revoke();
else if (command === "validate") await readProposal(argument("--manifest") ?? "").then(() => console.log("publisher manifest valid"));
else throw new Error("usage: publisher.ts prepare --dry-run | apply --manifest <file> | revoke --entry <collection/slug> --confirm | validate --manifest <file>");
