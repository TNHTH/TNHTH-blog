import { createHash } from "node:crypto";

export const migrationActions = ["move", "merge", "split", "redirect", "drop-with-reason"] as const;
export const migrationStatuses = ["pending", "verified", "needs-review", "skipped", "failed"] as const;
export const mediaStatuses = ["pending-sanitization", "sanitized", "skipped-with-reason"] as const;

export type MigrationAction = (typeof migrationActions)[number];
export type MigrationStatus = (typeof migrationStatuses)[number];
export type MediaStatus = (typeof mediaStatuses)[number];

export interface MigrationMediaRef {
  source: string;
  status: MediaStatus;
  reason?: string;
}

export interface MigrationRecord {
  id: string;
  source: { collection: string; slug: string; urls: string[] };
  target: { collection: string; slug: string; urls: string[] };
  action: MigrationAction;
  status: MigrationStatus;
  bodyIntegrity: { oldNormalizedSha256: string; newNormalizedSha256: string };
  mediaRefs: MigrationMediaRef[];
}

export function normalizeMarkdownBody(markdown: string): string {
  const normalized = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  return normalized.replace(/\r\n?/g, "\n").split("\n").map((line) => line.replace(/[ \t]+$/g, "")).join("\n").trim();
}

export function bodyHash(markdown: string): string {
  return createHash("sha256").update(normalizeMarkdownBody(markdown), "utf8").digest("hex");
}

export function extractMediaRefs(markdown: string): string[] {
  const refs = new Set<string>();
  for (const match of markdown.matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)|<img[^>]+src=["']([^"']+)["']/gi)) refs.add(match[1] ?? match[2]);
  return [...refs];
}

export function isVerifiedBodyMigration(record: MigrationRecord): boolean {
  return record.action === "redirect" || record.bodyIntegrity.oldNormalizedSha256 === record.bodyIntegrity.newNormalizedSha256;
}

export function assertMigrationLedger(records: MigrationRecord[]): void {
  for (const record of records) {
    if (!migrationActions.includes(record.action)) throw new Error(`${record.id}: unsupported migration action`);
    if (!migrationStatuses.includes(record.status)) throw new Error(`${record.id}: unsupported migration status`);
    if (record.status === "verified" && !isVerifiedBodyMigration(record)) throw new Error(`${record.id}: verified migration has different body hashes`);
    if (record.mediaRefs.some((media) => media.status === "pending-sanitization")) throw new Error(`${record.id}: media still needs sanitization`);
  }
}
