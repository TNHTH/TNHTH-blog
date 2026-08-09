import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readRepoConfig, syncGitHub } from "../scripts/github/sync";

const apiRepo = {
  id: 1,
  full_name: "TNHTH/example",
  html_url: "https://github.com/TNHTH/example",
  description: "A public repository",
  homepage: null,
  language: "TypeScript",
  topics: ["robotics"],
  stargazers_count: 2,
  forks_count: 1,
  open_issues_count: 0,
  license: { spdx_id: "MIT" },
  default_branch: "main",
  archived: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-08-10T00:00:00Z",
  pushed_at: "2026-08-10T00:00:00Z",
};

async function fixtureRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tnhth-github-"));
  await fs.mkdir(path.join(root, "config"), { recursive: true });
  await fs.mkdir(path.join(root, "src", "data", "generated"), { recursive: true });
  await fs.writeFile(path.join(root, "config", "public-repos.yml"), "version: 1\nrepos:\n  - owner: TNHTH\n    name: example\n    title: Example\n    category: robotics\n", "utf8");
  return root;
}

describe("GitHub snapshot sync", () => {
  it("validates a narrow explicit allowlist", () => {
    expect(readRepoConfig("version: 1\nrepos: []")).toEqual([]);
    expect(() => readRepoConfig("version: 1\nrepos:\n  - owner: TNHTH\n    name: example\n    title: Example\n    category: robotics\n    token: nope")).toThrow("unknown fields");
  });

  it("handles 304 from a cached repository", async () => {
    const root = await fixtureRoot();
    let calls = 0;
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls += 1;
      if (calls === 1) return new Response(JSON.stringify(apiRepo), { status: 200, headers: { etag: '"v1"' } });
      expect((init?.headers as Record<string, string>)["If-None-Match"]).toBe('"v1"');
      return new Response(null, { status: 304 });
    };
    await syncGitHub({ root, fetchImpl });
    const second = await syncGitHub({ root, fetchImpl });
    expect(second.stale).toBe(false);
    expect(second.repos[0].fullName).toBe("TNHTH/example");
  });

  it("keeps the previous snapshot on partial failure", async () => {
    const root = await fixtureRoot();
    const fetchImpl = async () => new Response(JSON.stringify(apiRepo), { status: 200 });
    await syncGitHub({ root, fetchImpl });
    const stale = await syncGitHub({ root, fetchImpl: async () => new Response("server error", { status: 500 }), sleep: async () => undefined });
    expect(stale.stale).toBe(true);
    expect(stale.repos[0].fullName).toBe("TNHTH/example");
    expect(stale.error).toContain("500");
  });
});
