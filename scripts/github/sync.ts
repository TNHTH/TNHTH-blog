import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

export interface RepoConfig {
  owner: string;
  name: string;
  title: string;
  category: string;
}

export interface GitHubSnapshotRepo {
  id: number;
  fullName: string;
  url: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  license: string | null;
  defaultBranch: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
  title: string;
  category: string;
}

export interface GitHubSnapshot {
  generatedAt: string;
  stale: boolean;
  lastSuccessfulSync: string | null;
  error?: string;
  repos: GitHubSnapshotRepo[];
}

interface CacheEntry { etag: string; repo: GitHubSnapshotRepo; }
interface CacheFile { entries: Record<string, CacheEntry>; }

interface ApiRepo {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  license?: { spdx_id?: string | null } | null;
  default_branch: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
}

export interface SyncOptions {
  root: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
  maxAttempts?: number;
}

const safeKeys = new Set(["owner", "name", "title", "category"]);

export function readRepoConfig(text: string): RepoConfig[] {
  const value = parse(text) as { version?: unknown; repos?: unknown; [key: string]: unknown };
  if (!value || value.version !== 1 || !Array.isArray(value.repos)) throw new Error("public repo config must use version: 1 and repos array");
  const seen = new Set<string>();
  return value.repos.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`repos[${index}] is invalid`);
    const record = item as Record<string, unknown>;
    const unknown = Object.keys(record).filter((key) => !safeKeys.has(key));
    if (unknown.length) throw new Error(`repos[${index}] has unknown fields: ${unknown.join(", ")}`);
    for (const key of ["owner", "name", "title", "category"]) if (typeof record[key] !== "string" || !record[key]) throw new Error(`repos[${index}].${key} is required`);
    const config = record as unknown as RepoConfig;
    const identity = `${config.owner}/${config.name}`;
    if (seen.has(identity)) throw new Error(`duplicate repository: ${identity}`);
    seen.add(identity);
    return config;
  });
}

function apiToSnapshot(config: RepoConfig, value: ApiRepo): GitHubSnapshotRepo {
  if (!Number.isInteger(value.id) || typeof value.full_name !== "string" || typeof value.html_url !== "string" || typeof value.default_branch !== "string") throw new Error(`${config.owner}/${config.name}: invalid GitHub response`);
  return {
    id: value.id,
    fullName: value.full_name,
    url: value.html_url,
    description: value.description ?? null,
    homepage: value.homepage ?? null,
    language: value.language ?? null,
    topics: Array.isArray(value.topics) && value.topics.every((topic) => typeof topic === "string") ? value.topics : [],
    stars: value.stargazers_count,
    forks: value.forks_count,
    openIssues: value.open_issues_count,
    license: value.license?.spdx_id ?? null,
    defaultBranch: value.default_branch,
    archived: value.archived,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
    pushedAt: value.pushed_at ?? null,
    title: config.title,
    category: config.category,
  };
}

function retryDelay(response: Response): number {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter >= 0) return Math.min(retryAfter * 1000, 5000);
  return 250;
}

async function fetchRepo(config: RepoConfig, cache: CacheFile, options: Required<Pick<SyncOptions, "fetchImpl" | "sleep" | "maxAttempts">>): Promise<CacheEntry> {
  const key = `${config.owner}/${config.name}`;
  const previous = cache.entries[key];
  for (let attempt = 0; attempt < options.maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
      if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      if (previous?.etag) headers["If-None-Match"] = previous.etag;
      const response = await options.fetchImpl(`https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.name)}`, { headers, signal: controller.signal });
      if (response.status === 304) {
        if (!previous) throw new Error(`${key}: received 304 without cached snapshot`);
        return previous;
      }
      if (response.status === 429 || response.status >= 500) {
        if (attempt + 1 >= options.maxAttempts) throw new Error(`${key}: GitHub API ${response.status}`);
        await options.sleep(retryDelay(response));
        continue;
      }
      if (!response.ok) throw new Error(`${key}: GitHub API ${response.status}`);
      const repo = apiToSnapshot(config, await response.json() as ApiRepo);
      return { etag: response.headers.get("etag") ?? "", repo };
    } catch (error) {
      if (attempt + 1 >= options.maxAttempts) throw error;
      if (error instanceof Error && error.name !== "AbortError") throw error;
      await options.sleep(250);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`${config.owner}/${config.name}: sync failed`);
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(file, "utf8")) as T; } catch { return fallback; }
}

async function writeAtomic(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}`;
  const handle = await fs.open(temp, "w");
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await fs.rename(temp, file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    await fs.rm(file, { force: true });
    await fs.rename(temp, file);
  }
}

export async function syncGitHub(options: SyncOptions): Promise<GitHubSnapshot> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const maxAttempts = options.maxAttempts ?? 3;
  const configPath = path.join(options.root, "config", "public-repos.yml");
  const outputPath = path.join(options.root, "src", "data", "generated", "github.json");
  const cachePath = path.join(options.root, ".tmp", "github-cache.json");
  const previous = await readJson<GitHubSnapshot | null>(outputPath, null);
  const cache = await readJson<CacheFile>(cachePath, { entries: {} });
  const configs = readRepoConfig(await fs.readFile(configPath, "utf8"));
  try {
    const nextEntries: Record<string, CacheEntry> = {};
    const repos: GitHubSnapshotRepo[] = [];
    for (const config of configs) {
      const result = await fetchRepo(config, cache, { fetchImpl, sleep, maxAttempts });
      nextEntries[`${config.owner}/${config.name}`] = result;
      repos.push(result.repo);
    }
    const snapshot: GitHubSnapshot = { generatedAt: now().toISOString(), stale: false, lastSuccessfulSync: now().toISOString(), repos };
    await writeAtomic(outputPath, snapshot);
    await writeAtomic(cachePath, { entries: nextEntries });
    return snapshot;
  } catch (error) {
    if (!previous) throw error;
    const stale: GitHubSnapshot = { ...previous, generatedAt: now().toISOString(), stale: true, error: error instanceof Error ? error.message : String(error) };
    await writeAtomic(outputPath, stale);
    return stale;
  }
}
