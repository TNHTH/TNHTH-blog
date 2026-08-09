import type { Collection } from "../policy";

export interface PublisherAsset {
  source: string;
  sourceSha256: string;
  mediaId: string;
}

export interface PublisherEntry {
  approvalId: string;
  source: string;
  collection: Collection;
  slug: string;
  sourceSha256: string;
  reviewedAt: string;
  revokedAt?: string;
  revokeReason?: string;
  assets: PublisherAsset[];
}

export interface PublisherPolicy {
  version: 2;
  entries: PublisherEntry[];
}

export interface PublicManifestEntry {
  approvalId: string;
  collection: Collection;
  slug: string;
  snapshotSha256: string;
  policyVersion: 2;
}
