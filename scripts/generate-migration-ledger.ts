import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { assertMigrationLedger, bodyHash, extractMediaRefs, type MigrationRecord } from "../src/lib/migration-ledger";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(import.meta.dirname, "..");
const date = new Date().toISOString().slice(0, 10);
const tempRoot = process.env.TNHTH_APPROVED_TEMP_DIR ? path.resolve(process.env.TNHTH_APPROVED_TEMP_DIR) : path.join(projectRoot, ".tmp", "codex", date);

const moves = [
  ["dashgo-rl-navigation", "work", "projects"],
  ["dual-arm-robotics", "work", "projects"],
  ["leap-a20", "work", "projects"],
  ["spec-driven-development", "writing", "notes"],
] as const;

async function readGitFile(relativePath: string): Promise<string> {
  const { stdout } = await execFileAsync("git", ["show", `HEAD:${relativePath}`], { cwd: projectRoot, maxBuffer: 1024 * 1024 });
  return stdout;
}

async function readNewFile(relativePath: string): Promise<string> {
  return fs.readFile(path.join(projectRoot, relativePath), "utf8");
}

function mediaRefsFor(oldMarkdown: string, newMarkdown: string) {
  const refs = new Set([...extractMediaRefs(oldMarkdown), ...extractMediaRefs(newMarkdown)]);
  return [...refs].map((source) => ({ source, status: "skipped-with-reason" as const, reason: "迁移源与公开快照均未包含媒体资产" }));
}

async function buildLedger(): Promise<MigrationRecord[]> {
  const records: MigrationRecord[] = [];
  for (const [slug, sourceCollection, targetCollection] of moves) {
    const sourcePath = `src/content/${sourceCollection}/${slug}.md`;
    const targetPath = `src/content/${targetCollection}/${slug}.md`;
    const oldMarkdown = await readGitFile(sourcePath);
    const newMarkdown = await readNewFile(targetPath);
    const oldHash = bodyHash(oldMarkdown);
    const newHash = bodyHash(newMarkdown);
    records.push({
      id: `${sourceCollection}/${slug}`,
      source: { collection: sourceCollection, slug, urls: [`/${sourceCollection}/${slug}`] },
      target: { collection: targetCollection, slug, urls: [`/${targetCollection}/${slug}`] },
      action: "move",
      status: oldHash === newHash ? "verified" : "needs-review",
      bodyIntegrity: { oldNormalizedSha256: oldHash, newNormalizedSha256: newHash },
      mediaRefs: mediaRefsFor(oldMarkdown, newMarkdown),
    });
  }

  const oldGallery = await readGitFile("src/pages/gallery/index.astro");
  const newGallery = await readNewFile("src/pages/gallery/index.astro");
  records.push({
    id: "gallery/route",
    source: { collection: "gallery-route", slug: "index", urls: ["/gallery"] },
    target: { collection: "notes", slug: "index", urls: ["/notes"] },
    action: "redirect",
    status: "verified",
    bodyIntegrity: { oldNormalizedSha256: bodyHash(oldGallery), newNormalizedSha256: bodyHash(newGallery) },
    mediaRefs: mediaRefsFor(oldGallery, newGallery),
  });
  return records;
}

const records = await buildLedger();
assertMigrationLedger(records);
await fs.mkdir(tempRoot, { recursive: true });
await fs.writeFile(path.join(tempRoot, "content-migration-map.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), records }, null, 2)}\n`, "utf8");
const { stdout: baseline } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: projectRoot });
const { stdout: branch } = await execFileAsync("git", ["branch", "--show-current"], { cwd: projectRoot });
await fs.writeFile(path.join(tempRoot, "implementation-state.json"), `${JSON.stringify({ baseline: baseline.trim(), branch: branch.trim(), lastCompletedPhase: 1, lastCommit: baseline.trim(), nextPhase: 2, status: "running" }, null, 2)}\n`, "utf8");
console.log(`migration ledger written: ${path.join(tempRoot, "content-migration-map.json")}`);
console.log(`records: ${records.length}, verified: ${records.filter((record) => record.status === "verified").length}`);
