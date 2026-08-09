import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { PublicManifestEntry, PublisherPolicy } from "./types";

export function snapshotSha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

export async function writePublicManifest(root: string, policy: PublisherPolicy, contentRoot: string): Promise<void> {
  const entries: PublicManifestEntry[] = [];
  for (const entry of policy.entries) {
    if (entry.revokedAt) continue;
    const file = path.join(contentRoot, entry.collection, `${entry.slug}.md`);
    const content = await fs.readFile(file, "utf8");
    entries.push({
      approvalId: entry.approvalId,
      collection: entry.collection,
      slug: entry.slug,
      snapshotSha256: snapshotSha256(content),
      policyVersion: 2,
    });
  }
  const manifest = { version: 1, generatedAt: new Date().toISOString(), entries };
  const output = path.join(root, "src", "data", "generated", "public-manifest.json");
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}
