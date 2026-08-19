import { parse } from "yaml";

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

export function readFrontmatter(source: string): { data: Record<string, unknown>; body: string } {
  if (!source.startsWith("---")) throw new Error("公开源文档必须包含 frontmatter");
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) throw new Error("frontmatter 格式无效");
  const data = (parse(match[1].replace(/\r\n?/g, "\n")) ?? {}) as Record<string, unknown>;
  return { data, body: match[2] };
}

export function assertPublicBody(body: string, label: string): void {
  const checks: Array<[RegExp, string]> = [
    [/!\[\[|\[\[|```dataview|```dataviewjs/i, "包含未转换的 Obsidian 内部链接或 Dataview"],
    [/(?:(?:^|[\s"'(])(?:[A-Za-z]:[\\/]|file:\/\/))|\/home\/[^\s"'()]+|\/Users\/[^\s"'()]+|\/mnt\/[a-z]\/[^\s"'()]+|~\/[^\s"'()]+/i, "包含本地绝对路径"],
    [/ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}/, "包含疑似访问令牌"],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i, "包含私钥"],
    [/authorization:\s*bearer\s+\S+/i, "包含 Authorization Bearer 凭据"],
    [/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/, "包含未配置为公开的邮箱"],
  ];
  for (const [pattern, message] of checks) if (pattern.test(body)) throw new Error(`${label}: ${message}`);
}
