import { describe, expect, it } from "vitest";
import { assertMigrationLedger, bodyHash, normalizeMarkdownBody } from "../src/lib/migration-ledger";
import { assertContentRelationships } from "../src/lib/content";

describe("migration ledger invariants", () => {
  it("hashes only normalized markdown body", () => {
    const first = "---\ntitle: First\n---\n\nbody  \r\n";
    const second = "---\ntitle: Second\n---\nbody\n";
    expect(normalizeMarkdownBody(first)).toBe("body");
    expect(bodyHash(first)).toBe(bodyHash(second));
  });

  it("rejects pending media in a verified ledger", () => {
    expect(() => assertMigrationLedger([{
      id: "example",
      source: { collection: "writing", slug: "example", urls: ["/writing/example"] },
      target: { collection: "notes", slug: "example", urls: ["/notes/example"] },
      action: "move",
      status: "verified",
      bodyIntegrity: { oldNormalizedSha256: "same", newNormalizedSha256: "same" },
      mediaRefs: [{ source: "image.jpg", status: "pending-sanitization" }],
    }])).toThrow(/media/);
  });

  it("rejects references to missing projects", () => {
    expect(() => assertContentRelationships([], [{ id: "note", data: { relatedProjects: ["missing"] } } as never])).toThrow(/missing project/);
  });
});
