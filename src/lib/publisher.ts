import { createHash } from "node:crypto";
import path from "node:path";

export const publisherVersion = "3.1.0";

export interface ProposalMedia {
  id: string;
  source: string;
  sha256: string;
}

export interface ProposalEntry {
  id: string;
  source: string;
  sourceSha256: string;
  publicSource?: string;
  publicSha256?: string;
  collection: "projects" | "notes";
  slug: string;
  media?: ProposalMedia[];
}

export interface PublishManifest {
  version: 2;
  mode: "proposal";
  generatedAt: string;
  toolVersion: string;
  entries: ProposalEntry[];
}

export interface HumanApprovalMedia {
  id: string;
  source: string;
  sha256: string;
}

export interface HumanApproval {
  source: string;
  sourceSha256: string;
  collection: string;
  slug: string;
  publicSource?: string;
  publicSha256?: string;
  media?: HumanApprovalMedia[];
  approved: boolean;
}

export function stableHash(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function isSafeVaultRelativePath(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");
  return !path.isAbsolute(value) && !/^[A-Za-z]:\//.test(normalized) && normalized !== "" && !normalized.split("/").some((segment) => segment === ".." || segment.startsWith("."));
}

export function assertProposal(entry: ProposalEntry): void {
  if (!isSafeVaultRelativePath(entry.source)) throw new Error(`${entry.id}: manifest source must be a vault-relative path`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(entry.slug)) throw new Error(`${entry.id}: slug contains unsupported characters`);
  if (entry.id !== `${entry.collection}/${entry.slug}`) throw new Error(`${entry.id}: entry id must equal \`\${collection}/\${slug}\``);
  if (!/^[a-f0-9]{64}$/.test(entry.sourceSha256)) throw new Error(`${entry.id}: sourceSha256 must be a SHA-256 hex digest`);
  if (entry.publicSource !== undefined && !isSafeVaultRelativePath(entry.publicSource)) throw new Error(`${entry.id}: publicSource must be a repository-relative path`);
  if (entry.publicSource !== undefined && (!entry.publicSha256 || !/^[a-f0-9]{64}$/.test(entry.publicSha256))) throw new Error(`${entry.id}: publicSha256 must be a SHA-256 hex digest when publicSource is provided`);
  if (entry.publicSource === undefined && entry.publicSha256 !== undefined) throw new Error(`${entry.id}: publicSha256 requires publicSource`);
  if (entry.collection === "notes" && (entry.media?.length ?? 0) > 0) throw new Error(`${entry.id}: notes cannot carry media — image evidence is a projects-only feature`);
  const mediaIds = new Set<string>();
  for (const media of entry.media ?? []) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(media.id)) throw new Error(`${entry.id}: media id must match ^[a-z0-9][a-z0-9-]*$`);
    if (mediaIds.has(media.id)) throw new Error(`${entry.id}: duplicate media id "${media.id}"`);
    mediaIds.add(media.id);
    if (!isSafeVaultRelativePath(media.source)) throw new Error(`${entry.id}: media source must be a vault-relative path`);
    if (!/^[a-f0-9]{64}$/.test(media.sha256)) throw new Error(`${entry.id}: media sha256 must be a SHA-256 hex digest`);
  }
}

export function assertManifest(manifest: PublishManifest): void {
  if (manifest.version !== 2 || manifest.mode !== "proposal") throw new Error("publisher manifest must be an unapproved version 2 proposal");
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) throw new Error("publisher manifest must contain entries");
  for (const entry of manifest.entries) {
    if (Object.prototype.hasOwnProperty.call(entry, "approved")) throw new Error(`${entry.id}: approval belongs in the human allowlist, not the manifest`);
    assertProposal(entry);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function assertHumanApproval(value: unknown): asserts value is HumanApproval {
  if (!isRecord(value)) throw new Error("allowlist entry must be an object");
  if (typeof value.source !== "string" || !isSafeVaultRelativePath(value.source)) throw new Error(`allowlist entry: source must be a vault-relative path, got ${JSON.stringify(value.source)}`);
  if (typeof value.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/.test(value.sourceSha256)) throw new Error(`${value.source}: allowlist sourceSha256 must be a SHA-256 hex digest`);
  if (typeof value.collection !== "string" || (value.collection !== "projects" && value.collection !== "notes")) throw new Error(`${value.source}: allowlist collection must be "projects" or "notes"`);
  if (typeof value.slug !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(value.slug)) throw new Error(`${value.source}: allowlist slug is invalid`);
  if (typeof value.approved !== "boolean") throw new Error(`${value.source}: allowlist approved must be a boolean`);
  if (value.publicSource !== undefined && (typeof value.publicSource !== "string" || !isSafeVaultRelativePath(value.publicSource))) throw new Error(`${value.source}: allowlist publicSource must be a repository-relative path`);
  if (value.publicSource !== undefined && (typeof value.publicSha256 !== "string" || !/^[a-f0-9]{64}$/.test(value.publicSha256))) throw new Error(`${value.source}: allowlist publicSha256 must be a SHA-256 hex digest when publicSource is set`);
  if (value.publicSource === undefined && value.publicSha256 !== undefined) throw new Error(`${value.source}: allowlist publicSha256 requires publicSource`);
  if (value.media !== undefined) {
    if (!Array.isArray(value.media)) throw new Error(`${value.source}: allowlist media must be an array`);
    const ids = new Set<string>();
    for (const media of value.media) {
      if (!isRecord(media) || typeof media.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(media.id)) throw new Error(`${value.source}: allowlist media id is invalid`);
      if (ids.has(media.id)) throw new Error(`${value.source}: allowlist has duplicate media id "${media.id}"`);
      ids.add(media.id);
      if (typeof media.source !== "string" || !isSafeVaultRelativePath(media.source)) throw new Error(`${value.source}: allowlist media "${media.id}" source must be a vault-relative path`);
      if (typeof media.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(media.sha256)) throw new Error(`${value.source}: allowlist media "${media.id}" sha256 must be a SHA-256 hex digest`);
    }
  }
}

export function assertHumanAllowlist(entries: unknown[]): asserts entries is HumanApproval[] {
  for (const entry of entries) assertHumanApproval(entry);
}

export function isHumanApproved(entry: ProposalEntry, allowlist: HumanApproval[]): boolean {
  return allowlist.some((approval) => {
    if (approval.approved !== true) return false;
    if (approval.source !== entry.source || approval.sourceSha256 !== entry.sourceSha256) return false;
    if (approval.collection !== entry.collection || approval.slug !== entry.slug) return false;
    if ((approval.publicSource ?? undefined) !== (entry.publicSource ?? undefined)) return false;
    if ((approval.publicSha256 ?? undefined) !== (entry.publicSha256 ?? undefined)) return false;
    const entryMedia = entry.media ?? [];
    const approvalMedia = approval.media ?? [];
    if (entryMedia.length !== approvalMedia.length) return false;
    return entryMedia.every((media) => approvalMedia.some((approved) => approved.id === media.id && approved.source === media.source && approved.sha256 === media.sha256));
  });
}

export function publicCollection(value: string): "projects" | "notes" {
  if (value === "work" || value === "project" || value === "projects") return "projects";
  if (value === "writing" || value === "note" || value === "notes") return "notes";
  throw new Error(`unsupported public collection: ${value}`);
}
