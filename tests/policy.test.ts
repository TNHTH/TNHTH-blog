import { describe, expect, it } from "vitest";
import { assertPublicBody, assertPublicFrontmatter, isBlockedPath, isInside, loadAllowList, readFrontmatter } from "../scripts/policy";

describe("publication policy", () => {
  it("blocks private system and raw diary areas", () => {
    expect(isBlockedPath("90_系统/备份/notes.md")).toBe(true);
    expect(isBlockedPath("40_生活/日记/2026.md")).toBe(true);
    expect(isBlockedPath("70_工作日志/项目/retrospective.md")).toBe(false);
    expect(isBlockedPath("40_生活/旅行/杭州.md")).toBe(false);
  });

  it("prevents path escape", () => {
    expect(isInside("D:/vault", "D:/vault/20_知识/note.md")).toBe(true);
    expect(isInside("D:/vault", "D:/vault/../secret.md")).toBe(false);
  });

  it("requires the two public flags", () => {
    const { data } = readFrontmatter(`---\ntitle: Note\nsummary: Summary\ndate: 2026-08-08\ntype: note\n---\nBody`);
    expect(() => assertPublicFrontmatter(data, { source: "x.md", collection: "notes", slug: "x", sha256: "x" })).toThrow("publish");
    data.publish = true;
    data.visibility = "public";
    expect(() => assertPublicFrontmatter(data, { source: "x.md", collection: "notes", slug: "x", sha256: "x" })).not.toThrow();
  });

  it("requires sanitization metadata for reviewed sources", () => {
    const { data } = readFrontmatter(`---\ntitle: Travel\nsummary: Summary\ndate: 2026-08-08\ntype: note\npublish: true\nvisibility: public\n---\nBody`);
    const entry = { source: "40_生活/旅行/travel.md", collection: "notes" as const, slug: "travel", sha256: "x", risk: "reviewed" as const };
    expect(() => assertPublicFrontmatter(data, entry)).toThrow("publicVersion");
    data.publicVersion = true;
    data.sanitized = true;
    expect(() => assertPublicFrontmatter(data, entry)).not.toThrow();
  });

  it("rejects internal links, secrets, paths, and emails", () => {
    expect(() => assertPublicBody("See [[Private Note]]", "note.md")).toThrow();
    expect(() => assertPublicBody(`token ${["ghp_", "x".repeat(30)].join("")}`, "note.md")).toThrow();
    expect(() => assertPublicBody(`D:${"\\cursor\\file\\obsidian"}`, "note.md")).toThrow();
    expect(() => assertPublicBody("contact person@example.com", "note.md")).toThrow();
    expect(() => assertPublicBody("A clean public note.", "note.md")).not.toThrow();
  });

  it("loads a versioned allowlist", () => {
    const list = loadAllowList("version: 1\nentries:\n  - source: 20_知识/note.md\n    collection: notes\n    slug: note\n    sha256: abc\n");
    expect(list.entries).toHaveLength(1);
    expect(() => loadAllowList("version: 2\nentries: []")).toThrow();
  });

  it("parses Windows frontmatter line endings", () => {
    const { data } = readFrontmatter("---\r\ntitle: Note\r\ndate: 2026-08-15\r\nrelatedProjects: [leap-a20]\r\n---\r\nBody");
    expect(data.relatedProjects).toEqual(["leap-a20"]);
  });
});
