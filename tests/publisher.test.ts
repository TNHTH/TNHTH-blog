import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parsePolicy } from "../scripts/publisher/allowlist";
import { readPublisherPolicy, revoke, sync } from "../scripts/publisher/service";
import { replaceContentAndAssets } from "../scripts/publisher/transaction";

async function tempRoot(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "tnhth-publisher-"));
}

function digest(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

describe("publisher v2", () => {
  it("rejects unknown fields and duplicate identities", () => {
    const valid = `version: 2\nentries:\n  - approvalId: PUB-ABC\n    source: public/note.md\n    collection: notes\n    slug: note\n    sourceSha256: ${"a".repeat(64)}\n    reviewedAt: 2026-08-10T00:00:00.000Z\n    assets: []\n`;
    expect(parsePolicy(valid).version).toBe(2);
    expect(() => parsePolicy(valid.replace("assets: []", "assets: []\n    privatePath: nope"))).toThrow("unknown fields");
    expect(() => parsePolicy(`${valid}${valid.slice(valid.indexOf("  - approvalId"))}`)).toThrow("duplicate approvalId");
  });

  it("restores content and assets when the second replacement fails", async () => {
    const root = await tempRoot();
    const content = path.join(root, "content");
    const assets = path.join(root, "assets");
    const stageContent = path.join(root, "stage-content");
    const stageAssets = path.join(root, "stage-assets");
    await fs.mkdir(content, { recursive: true });
    await fs.mkdir(assets, { recursive: true });
    await fs.mkdir(stageContent, { recursive: true });
    await fs.mkdir(stageAssets, { recursive: true });
    await fs.writeFile(path.join(content, "old.md"), "old", "utf8");
    await fs.writeFile(path.join(assets, "old.webp"), "old asset", "utf8");
    await fs.writeFile(path.join(stageContent, "new.md"), "new", "utf8");
    await fs.writeFile(path.join(stageAssets, "new.webp"), "new asset", "utf8");
    await expect(replaceContentAndAssets({ stagedContent: stageContent, stagedAssets: stageAssets, contentDestination: content, assetsDestination: assets, failAt: "assets" })).rejects.toThrow("assets replace");
    await expect(fs.readFile(path.join(content, "old.md"), "utf8")).resolves.toBe("old");
    await expect(fs.readFile(path.join(assets, "old.webp"), "utf8")).resolves.toBe("old asset");
  });

  it("syncs a fake vault and keeps revoke provenance", async () => {
    const root = await tempRoot();
    const vault = path.join(root, "vault");
    const repo = path.join(root, "repo");
    const source = "public/note.md";
    const markdown = `---\ntitle: Fake note\nsummary: Safe summary\ndate: 2026-08-10\ntype: note\npublish: true\nvisibility: public\ncategory: Test\n---\n\nA safe public body.\n`;
    await fs.mkdir(path.join(vault, "public"), { recursive: true });
    await fs.mkdir(path.join(repo, "src", "content"), { recursive: true });
    await fs.mkdir(path.join(repo, "src", "assets"), { recursive: true });
    await fs.writeFile(path.join(vault, source), markdown, "utf8");
    const policyPath = path.join(vault, "publish-allowlist.yml");
    await fs.writeFile(policyPath, `version: 2\nentries:\n  - approvalId: PUB-FAKE\n    source: ${source}\n    collection: notes\n    slug: fake-note\n    sourceSha256: ${digest(markdown)}\n    reviewedAt: 2026-08-10T00:00:00.000Z\n    assets: []\n`, "utf8");
    const paths = { repoRoot: repo, vaultRoot: vault, policyPath };
    await sync(paths);
    await expect(fs.readFile(path.join(repo, "src", "content", "notes", "fake-note.md"), "utf8")).resolves.toContain("Fake note");
    const manifest = JSON.parse(await fs.readFile(path.join(repo, "src", "data", "generated", "public-manifest.json"), "utf8"));
    expect(manifest.entries[0]).toEqual(expect.objectContaining({ approvalId: "PUB-FAKE", collection: "notes", slug: "fake-note", policyVersion: 2 }));
    expect(manifest.entries[0]).not.toHaveProperty("source");
    await revoke(paths, "PUB-FAKE", "withdrawn for review");
    const policy = await readPublisherPolicy(policyPath);
    expect(policy.entries[0].revokeReason).toBe("withdrawn for review");
    expect(policy.entries[0].revokedAt).toBeTypeOf("string");
  });
});
