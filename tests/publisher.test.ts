import { describe, expect, it } from "vitest";
import { assertManifest, isHumanApproved, type ProposalEntry } from "../src/lib/publisher";

const entry: ProposalEntry = {
  id: "notes/example",
  source: "10_公开/example.md",
  sourceSha256: "a".repeat(64),
  collection: "notes",
  slug: "example",
};

describe("publisher trust boundary", () => {
  it("requires human approval to match both source and hash", () => {
    expect(isHumanApproved(entry, [{ source: entry.source, sourceSha256: entry.sourceSha256, approved: true }])).toBe(true);
    expect(isHumanApproved(entry, [{ source: entry.source, sourceSha256: "b".repeat(64), approved: true }])).toBe(false);
    expect(isHumanApproved(entry, [{ source: entry.source, sourceSha256: entry.sourceSha256, approved: false }])).toBe(false);
  });

  it("rejects approval fields embedded in a proposal manifest", () => {
    const manifest = { version: 1, mode: "proposal", generatedAt: "2026-08-15T00:00:00.000Z", toolVersion: "3.0.0", entries: [{ ...entry, approved: true }] };
    expect(() => assertManifest(manifest as never)).toThrow(/human allowlist/);
  });
});
