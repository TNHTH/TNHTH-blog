import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

export type Collection = "work" | "notes" | "writing";
export type Risk = "normal" | "reviewed";

export interface AssetEntry { source: string; sha256: string; }
export interface AllowEntry {
  source: string;
  collection: Collection;
  slug: string;
  sha256: string;
  risk?: Risk;
  assets?: AssetEntry[];
}
export interface AllowList { version: number; entries: AllowEntry[]; }

export const blockedRoots = [
  ".obsidian", ".claude", ".claudian", ".playwright-mcp", "90_系统", "模板",
];

export const blockedSubtrees = [
  "40_生活/日记", "40_生活/周记", "40_生活/心理咨询", "40_生活/个人分析",
];

export const blockedExtensions = new Set([
  ".env", ".db", ".sqlite", ".sqlite3", ".log", ".key", ".pem", ".p12",
  ".docx", ".xlsx", ".pptx", ".zip", ".7z", ".rar", ".exe", ".bin", ".csv", ".pdf",
]);

export function normalizeRelative(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

export function isBlockedPath(relative: string): boolean {
  const normalized = normalizeRelative(relative);
  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((segment) => blockedRoots.includes(segment) || segment.startsWith("."))) return true;
  return blockedSubtrees.some((root) => normalized === root || normalized.startsWith(`${root}/`));
}

export function isInside(root: string, candidate: string): boolean {
  const base = path.resolve(root);
  const target = path.resolve(candidate);
  return target === base || target.startsWith(`${base}${path.sep}`);
}

export async function sha256File(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  hash.update(await fs.readFile(filePath));
  return hash.digest("hex");
}

export function loadAllowList(text: string): AllowList {
  const value = parse(text) as AllowList;
  if (!value || value.version !== 1 || !Array.isArray(value.entries)) throw new Error("发布清单必须使用 version: 1 和 entries 数组");
  return value;
}

export function readFrontmatter(source: string): { data: Record<string, unknown>; body: string } {
  if (!source.startsWith("---")) throw new Error("公开源文档必须包含 frontmatter");
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) throw new Error("frontmatter 格式无效");
  const data = (parse(match[1].replace(/\r\n?/g, "\n")) ?? {}) as Record<string, unknown>;
  return { data, body: match[2] };
}

export function assertPublicFrontmatter(data: Record<string, unknown>, entry: AllowEntry): void {
  const required = ["title", "summary", "date", "type"];
  for (const key of required) if (!data[key]) throw new Error(`${entry.source}: 缺少 frontmatter.${key}`);
  if (data.publish !== true || data.visibility !== "public") throw new Error(`${entry.source}: 必须同时设置 publish: true 和 visibility: public`);
  const expectedType = entry.collection === "work" ? "project" : entry.collection === "notes" ? "note" : "writing";
  if (data.type !== expectedType) throw new Error(`${entry.source}: type 与 collection 不一致`);
  if (entry.risk === "reviewed" && (data.publicVersion !== true || data.sanitized !== true)) throw new Error(`${entry.source}: reviewed 内容必须设置 publicVersion: true 和 sanitized: true`);
  if (entry.collection === "work") {
    for (const key of ["role", "contribution", "status"]) if (!data[key]) throw new Error(`${entry.source}: Work 缺少 frontmatter.${key}`);
  }
}

export function assertPublicBody(body: string, label: string): void {
  const checks: Array<[RegExp, string]> = [
    [/!\[\[|\[\[|```dataview|```dataviewjs/i, "包含未转换的 Obsidian 内部链接或 Dataview"],
    [/(?:^|[\s"'(])(?:[A-Za-z]:[\\/]|\/home\/gwh|file:\/\/)/i, "包含本地绝对路径"],
    [/ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}/, "包含疑似访问令牌"],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i, "包含私钥"],
    [/authorization:\s*bearer\s+\S+/i, "包含 Authorization Bearer 凭据"],
    [/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/, "包含未配置为公开的邮箱"],
  ];
  for (const [pattern, message] of checks) if (pattern.test(body)) throw new Error(`${label}: ${message}`);
}

export function publicFrontmatter(data: Record<string, unknown>): Record<string, unknown> {
  const allowed = ["title", "summary", "date", "updated", "tags", "type", "status", "role", "contribution", "evidence", "repo", "featured", "category", "cover"];
  return Object.fromEntries(allowed.filter((key) => data[key] !== undefined).map((key) => [key, data[key]]));
}
