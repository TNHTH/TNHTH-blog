import { describe, expect, it } from "vitest";
import { parsePublicDocument, serializePublicDocument, validatePublicEdit } from "../src/lib/public-content";

const source = `---
title: 示例文章
summary: 一句话摘要
date: 2026-08-09
type: note
tags:
  - 测试
---

# 正文

这是公开内容。
`;

describe("public content editor contract", () => {
  it("parses and serializes a public document without losing fields", () => {
    const document = parsePublicDocument(source);
    expect(document.data.title).toBe("示例文章");
    expect(document.body).toContain("这是公开内容");
    expect(parsePublicDocument(serializePublicDocument(document)).data.tags).toEqual(["测试"]);
  });

  it("rejects missing required metadata", () => {
    const document = parsePublicDocument(source);
    delete document.data.summary;
    expect(validatePublicEdit(document)).toContain("缺少 summary");
  });

  it.each([
    ["[[私人笔记]]", "Obsidian"],
    ["D:\\cursor\\file\\obsidian", "本地绝对路径"],
    ["someone@example.com", "邮箱地址"],
    [`-----BEGIN PRIVATE KEY-----\nsecret`, "私钥"],
  ])("rejects unsafe body: %s", (body, expected) => {
    const document = parsePublicDocument(source);
    document.body = body;
    expect(validatePublicEdit(document).join("；")).toContain(expected);
  });
});
