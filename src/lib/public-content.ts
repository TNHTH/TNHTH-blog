import { parse, stringify } from "yaml";

export interface PublicDocument {
  data: Record<string, unknown>;
  body: string;
}

export function parsePublicDocument(source: string): PublicDocument {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!match) throw new Error("文档缺少有效的 YAML Frontmatter");
  return { data: (parse(match[1]) ?? {}) as Record<string, unknown>, body: match[2] };
}

export function serializePublicDocument(document: PublicDocument): string {
  const frontmatter = stringify(document.data, { lineWidth: 0 }).trimEnd();
  return `---\n${frontmatter}\n---\n\n${document.body.trim()}\n`;
}

export function validatePublicEdit(document: PublicDocument): string[] {
  const errors: string[] = [];
  for (const key of ["title", "summary", "date", "type"]) {
    if (!document.data[key]) errors.push(`缺少 ${key}`);
  }
  const source = `${JSON.stringify(document.data)}\n${document.body}`;
  const checks: Array<[RegExp, string]> = [
    [/!\[\[|\[\[|```dataview|```dataviewjs/i, "包含未转换的 Obsidian 链接或 Dataview"],
    [/(?:^|[\s"'(])(?:[A-Za-z]:[\\/]|\/home\/|file:\/\/)/i, "包含本地绝对路径"],
    [/ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}/, "包含疑似访问令牌"],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i, "包含私钥"],
    [/authorization:\s*bearer\s+\S+/i, "包含认证凭据"],
    [/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/, "包含邮箱地址"],
  ];
  for (const [pattern, message] of checks) if (pattern.test(source)) errors.push(message);
  return errors;
}

export const publicStatusLabels: Record<string, string> = {
  ongoing: "进行中",
  partial: "阶段性",
  reproduction: "复现适配",
  complete: "已完成",
};
