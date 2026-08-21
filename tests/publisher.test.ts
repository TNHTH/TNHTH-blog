import { describe, expect, it } from "vitest";
import { assertHumanApproval, assertManifest, assertProposal, isHumanApproved, type HumanApproval, type ProposalEntry } from "../src/lib/publisher";

const entry: ProposalEntry = {
  id: "notes/example",
  source: "10_公开/example.md",
  sourceSha256: "a".repeat(64),
  collection: "notes",
  slug: "example",
};

const baseApproval: HumanApproval = {
  source: entry.source,
  sourceSha256: entry.sourceSha256,
  collection: entry.collection,
  slug: entry.slug,
  approved: true,
};

describe("publisher trust boundary", () => {
  it("requires source and hash to match", () => {
    expect(isHumanApproved(entry, [baseApproval])).toBe(true);
    expect(isHumanApproved(entry, [{ ...baseApproval, sourceSha256: "b".repeat(64) }])).toBe(false);
    expect(isHumanApproved(entry, [{ ...baseApproval, approved: false }])).toBe(false);
  });

  it("requires collection and slug to match the approved target", () => {
    expect(isHumanApproved(entry, [{ ...baseApproval, collection: "projects" }])).toBe(false);
    expect(isHumanApproved(entry, [{ ...baseApproval, slug: "different-slug" }])).toBe(false);
  });

  it("requires publicSource/publicSha256 to match when the entry has them", () => {
    const withPublicDraft: ProposalEntry = { ...entry, publicSource: "src/content/notes/example.md", publicSha256: "c".repeat(64) };
    expect(isHumanApproved(withPublicDraft, [baseApproval])).toBe(false);
    expect(isHumanApproved(withPublicDraft, [{ ...baseApproval, publicSource: "src/content/notes/example.md", publicSha256: "c".repeat(64) }])).toBe(true);
    expect(isHumanApproved(withPublicDraft, [{ ...baseApproval, publicSource: "src/content/notes/example.md", publicSha256: "d".repeat(64) }])).toBe(false);
  });

  it("requires every media id, source, and hash to be individually approved", () => {
    const projectEntry: ProposalEntry = { ...entry, collection: "projects", id: "projects/example", media: [{ id: "robot-main", source: "10_项目/x/a.jpg", sha256: "e".repeat(64) }] };
    const projectApproval: HumanApproval = { ...baseApproval, collection: "projects" };
    expect(isHumanApproved(projectEntry, [projectApproval])).toBe(false);
    expect(isHumanApproved(projectEntry, [{ ...projectApproval, media: [{ id: "robot-main", source: "10_项目/x/a.jpg", sha256: "e".repeat(64) }] }])).toBe(true);
    expect(isHumanApproved(projectEntry, [{ ...projectApproval, media: [{ id: "robot-main", source: "10_项目/x/DIFFERENT.jpg", sha256: "e".repeat(64) }] }])).toBe(false);
    expect(isHumanApproved(projectEntry, [{ ...projectApproval, media: [{ id: "robot-main", source: "10_项目/x/a.jpg", sha256: "f".repeat(64) }] }])).toBe(false);
  });

  it("rejects approval fields embedded in a proposal manifest", () => {
    const manifest = { version: 2, mode: "proposal", generatedAt: "2026-08-15T00:00:00.000Z", toolVersion: "3.1.0", entries: [{ ...entry, approved: true }] };
    expect(() => assertManifest(manifest as never)).toThrow(/human allowlist/);
  });

  it("rejects a v1 manifest", () => {
    const manifest = { version: 1, mode: "proposal", generatedAt: "2026-08-15T00:00:00.000Z", toolVersion: "3.1.0", entries: [entry] };
    expect(() => assertManifest(manifest as never)).toThrow(/version 2/);
  });

  it("requires entry id to equal collection/slug", () => {
    expect(() => assertProposal({ ...entry, id: "wrong/id" })).toThrow(/entry id/);
  });

  it("rejects notes entries that carry media", () => {
    expect(() => assertProposal({ ...entry, media: [{ id: "x", source: "a.jpg", sha256: "a".repeat(64) }] })).toThrow(/notes cannot carry media/);
  });

  it("requires stable media ids and rejects duplicates within one entry", () => {
    const withMedia: ProposalEntry = { ...entry, collection: "projects", id: "projects/example", media: [{ id: "robot-main", source: "10_项目/x/a.jpg", sha256: "a".repeat(64) }] };
    expect(() => assertProposal(withMedia)).not.toThrow();
    const missingId: ProposalEntry = { ...withMedia, media: [{ id: "", source: "10_项目/x/a.jpg", sha256: "a".repeat(64) } as never] };
    expect(() => assertProposal(missingId)).toThrow(/media id/);
    const duplicateId: ProposalEntry = { ...withMedia, media: [
      { id: "robot-main", source: "10_项目/x/a.jpg", sha256: "a".repeat(64) },
      { id: "robot-main", source: "10_项目/x/b.jpg", sha256: "b".repeat(64) },
    ] };
    expect(() => assertProposal(duplicateId)).toThrow(/duplicate media id/);
  });

  it("assertHumanApproval rejects a malformed allowlist entry at runtime, not just via TypeScript", () => {
    expect(() => assertHumanApproval({ source: "x.md" })).toThrow(/sourceSha256/);
    expect(() => assertHumanApproval({ source: "x.md", sourceSha256: "a".repeat(64), collection: "robot", slug: "x", approved: true })).toThrow(/collection/);
    expect(() => assertHumanApproval({ source: "x.md", sourceSha256: "a".repeat(64), collection: "notes", slug: "x", approved: "yes-whatever" })).toThrow(/approved/);
    expect(() => assertHumanApproval({ source: "x.md", sourceSha256: "a".repeat(64), collection: "notes", slug: "x", approved: true })).not.toThrow();
  });
});
