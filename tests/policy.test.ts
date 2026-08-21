import { describe, expect, it } from "vitest";
import { assertPublicBody, isBlockedPath, readFrontmatter } from "../scripts/policy";

describe("publication policy", () => {
  it("blocks private system and raw diary areas", () => {
    expect(isBlockedPath("90_系统/备份/notes.md")).toBe(true);
    expect(isBlockedPath("40_生活/日记/2026.md")).toBe(true);
    expect(isBlockedPath("70_工作日志/项目/retrospective.md")).toBe(false);
    expect(isBlockedPath("40_生活/旅行/杭州.md")).toBe(false);
  });

  it("rejects internal links, secrets, paths, and emails", () => {
    expect(() => assertPublicBody("See [[Private Note]]", "note.md")).toThrow();
    expect(() => assertPublicBody(`token ${["ghp_", "x".repeat(30)].join("")}`, "note.md")).toThrow();
    expect(() => assertPublicBody(`D:${"\\cursor\\file\\obsidian"}`, "note.md")).toThrow();
    expect(() => assertPublicBody("contact person@example.com", "note.md")).toThrow();
    expect(() => assertPublicBody("A clean public note.", "note.md")).not.toThrow();
  });

  it("rejects local absolute paths regardless of username or OS", () => {
    expect(() => assertPublicBody("参考 /home/guohao/private/note.md", "note.md")).toThrow("本地绝对路径");
    expect(() => assertPublicBody("参考 /home/ubuntu/logs/x.log", "note.md")).toThrow("本地绝对路径");
    expect(() => assertPublicBody("see /Users/guohao/Documents/x.md", "note.md")).toThrow("本地绝对路径");
    expect(() => assertPublicBody("see /mnt/c/Users/guohao/Desktop/x.md", "note.md")).toThrow("本地绝对路径");
    expect(() => assertPublicBody("cd ~/vault/private.md", "note.md")).toThrow("本地绝对路径");
    expect(() => assertPublicBody("open file:///home/guohao/note.md", "note.md")).toThrow("本地绝对路径");
  });

  it("does not flag URLs that merely contain /home/ or /Users/ as a path segment", () => {
    expect(() => assertPublicBody("参考 https://example.com/home/user/article", "note.md")).not.toThrow();
    expect(() => assertPublicBody("见 https://saas.io/Users/dashboard/settings", "note.md")).not.toThrow();
  });

  it("flags a local path even when written as inline Markdown code", () => {
    expect(() => assertPublicBody("路径是 `/home/guohao/private.txt`", "note.md")).toThrow("本地绝对路径");
    expect(() => assertPublicBody("配置在 `D:\\cursor\\secret`", "note.md")).toThrow("本地绝对路径");
  });

  it("does not flag generic mentions of /home or /Users without a real path", () => {
    expect(() => assertPublicBody("Linux 用户目录通常位于 /home/ 下。", "note.md")).not.toThrow();
    expect(() => assertPublicBody("macOS 的用户目录在 /Users/ 下。", "note.md")).not.toThrow();
  });

  it("parses Windows frontmatter line endings", () => {
    const { data } = readFrontmatter("---\r\ntitle: Note\r\ndate: 2026-08-15\r\nrelatedProjects: [leap-a20]\r\n---\r\nBody");
    expect(data.relatedProjects).toEqual(["leap-a20"]);
  });
});
