import { parse, stringify } from "yaml";
import type { PublisherAsset, PublisherEntry, PublisherPolicy } from "./types";

const collections = new Set(["work", "notes", "writing"]);
const sha256Pattern = /^[a-f0-9]{64}$/i;
const slugPattern = /^[a-z0-9][a-z0-9-]*$/;

function exactKeys(value: Record<string, unknown>, allowed: string[], label: string): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`${label}: unknown fields: ${unknown.join(", ")}`);
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label}: must be a non-empty string`);
  return value;
}

function parseAsset(value: unknown, index: number): PublisherAsset {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`assets[${index}]: invalid`);
  const record = value as Record<string, unknown>;
  exactKeys(record, ["source", "sourceSha256", "mediaId"], `assets[${index}]`);
  const source = requiredString(record.source, `assets[${index}].source`);
  const sourceSha256 = requiredString(record.sourceSha256, `assets[${index}].sourceSha256`);
  const mediaId = requiredString(record.mediaId, `assets[${index}].mediaId`);
  if (!sha256Pattern.test(sourceSha256)) throw new Error(`assets[${index}].sourceSha256: must be a SHA-256 hex digest`);
  if (!slugPattern.test(mediaId)) throw new Error(`assets[${index}].mediaId: invalid`);
  return { source, sourceSha256: sourceSha256.toLowerCase(), mediaId };
}

function parseEntry(value: unknown, index: number): PublisherEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`entries[${index}]: invalid`);
  const record = value as Record<string, unknown>;
  exactKeys(record, ["approvalId", "source", "collection", "slug", "sourceSha256", "reviewedAt", "revokedAt", "revokeReason", "assets"], `entries[${index}]`);
  const approvalId = requiredString(record.approvalId, `entries[${index}].approvalId`);
  const source = requiredString(record.source, `entries[${index}].source`);
  const collection = requiredString(record.collection, `entries[${index}].collection`);
  const slug = requiredString(record.slug, `entries[${index}].slug`);
  const sourceSha256 = requiredString(record.sourceSha256, `entries[${index}].sourceSha256`);
  const reviewedAt = requiredString(record.reviewedAt, `entries[${index}].reviewedAt`);
  if (!/^PUB-[A-Z0-9-]+$/.test(approvalId)) throw new Error(`entries[${index}].approvalId: invalid`);
  if (!collections.has(collection)) throw new Error(`entries[${index}].collection: invalid`);
  if (!slugPattern.test(slug)) throw new Error(`entries[${index}].slug: invalid`);
  if (!sha256Pattern.test(sourceSha256)) throw new Error(`entries[${index}].sourceSha256: must be a SHA-256 hex digest`);
  if (Number.isNaN(Date.parse(reviewedAt))) throw new Error(`entries[${index}].reviewedAt: invalid date`);
  const revokedAt = record.revokedAt === undefined ? undefined : requiredString(record.revokedAt, `entries[${index}].revokedAt`);
  const revokeReason = record.revokeReason === undefined ? undefined : requiredString(record.revokeReason, `entries[${index}].revokeReason`);
  if ((revokedAt && !revokeReason) || (!revokedAt && revokeReason)) throw new Error(`entries[${index}]: revokedAt and revokeReason must be paired`);
  if (revokedAt && Number.isNaN(Date.parse(revokedAt))) throw new Error(`entries[${index}].revokedAt: invalid date`);
  const assets = record.assets === undefined ? [] : record.assets;
  if (!Array.isArray(assets)) throw new Error(`entries[${index}].assets: must be an array`);
  return {
    approvalId,
    source,
    collection: collection as PublisherEntry["collection"],
    slug,
    sourceSha256: sourceSha256.toLowerCase(),
    reviewedAt,
    ...(revokedAt ? { revokedAt } : {}),
    ...(revokeReason ? { revokeReason } : {}),
    assets: assets.map(parseAsset),
  };
}

export function parsePolicy(text: string): PublisherPolicy {
  const value = parse(text) as Record<string, unknown>;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("publisher policy must be a mapping");
  exactKeys(value, ["version", "entries"], "publisher policy");
  if (value.version !== 2) throw new Error("publisher policy must use version: 2");
  if (!Array.isArray(value.entries)) throw new Error("publisher policy entries must be an array");
  const entries = value.entries.map(parseEntry);
  const approvals = new Set<string>();
  const slugs = new Set<string>();
  for (const entry of entries) {
    if (approvals.has(entry.approvalId)) throw new Error(`duplicate approvalId: ${entry.approvalId}`);
    const slugKey = `${entry.collection}:${entry.slug}`;
    if (slugs.has(slugKey)) throw new Error(`duplicate collection/slug: ${slugKey}`);
    approvals.add(entry.approvalId);
    slugs.add(slugKey);
  }
  return { version: 2, entries };
}

export function serializePolicy(policy: PublisherPolicy): string {
  return stringify(policy, { lineWidth: 0 });
}
