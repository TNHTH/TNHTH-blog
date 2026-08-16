import { createHash } from "node:crypto";
import path from "node:path";

export const publisherVersion = "3.0.0";

export interface ProposalMedia {
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
  version: 1;
  mode: "proposal";
  generatedAt: string;
  toolVersion: string;
  entries: ProposalEntry[];
}

export interface HumanApproval {
  source: string;
  sourceSha256?: string;
  sha256?: string;
  approved?: boolean;
  collection?: string;
  slug?: string;
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
  if (!/^[a-f0-9]{64}$/.test(entry.sourceSha256)) throw new Error(`${entry.id}: sourceSha256 must be a SHA-256 hex digest`);
  if (entry.publicSource !== undefined && !isSafeVaultRelativePath(entry.publicSource)) throw new Error(`${entry.id}: publicSource must be a repository-relative path`);
  if (entry.publicSource !== undefined && (!entry.publicSha256 || !/^[a-f0-9]{64}$/.test(entry.publicSha256))) throw new Error(`${entry.id}: publicSha256 must be a SHA-256 hex digest when publicSource is provided`);
  for (const media of entry.media ?? []) {
    if (!isSafeVaultRelativePath(media.source)) throw new Error(`${entry.id}: media source must be a vault-relative path`);
    if (!/^[a-f0-9]{64}$/.test(media.sha256)) throw new Error(`${entry.id}: media sha256 must be a SHA-256 hex digest`);
  }
}

export function assertManifest(manifest: PublishManifest): void {
  if (manifest.version !== 1 || manifest.mode !== "proposal") throw new Error("publisher manifest must be an unapproved version 1 proposal");
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) throw new Error("publisher manifest must contain entries");
  for (const entry of manifest.entries) {
    if (Object.prototype.hasOwnProperty.call(entry, "approved")) throw new Error(`${entry.id}: approval belongs in the human allowlist, not the manifest`);
    assertProposal(entry);
  }
}

export function approvalSha256(approval: HumanApproval): string | undefined {
  return approval.sourceSha256 ?? approval.sha256;
}

export function isHumanApproved(entry: ProposalEntry, allowlist: HumanApproval[]): boolean {
  return allowlist.some((approval) => approval.approved === true && approval.source === entry.source && approvalSha256(approval) === entry.sourceSha256);
}

export function publicCollection(value: string): "projects" | "notes" {
  if (value === "work" || value === "project" || value === "projects") return "projects";
  if (value === "writing" || value === "note" || value === "notes") return "notes";
  throw new Error(`unsupported public collection: ${value}`);
}
