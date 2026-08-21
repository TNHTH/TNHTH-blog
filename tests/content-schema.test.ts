import { describe, expect, it } from "vitest";
import { z } from "astro/zod";
import { createEvidenceSchema } from "../src/lib/evidence-schema";

const evidenceSchema = createEvidenceSchema(() => z.string());

describe("evidence discriminated union (shared with content.config.ts)", () => {
  it("accepts an image entry with src and alt", () => {
    expect(evidenceSchema.safeParse([{ kind: "image", label: "实机运行", src: "a.webp", alt: "机器人实机运行画面" }]).success).toBe(true);
  });

  it("rejects an image entry missing alt", () => {
    expect(evidenceSchema.safeParse([{ kind: "image", label: "实机运行", src: "a.webp" }]).success).toBe(false);
  });

  it("rejects an image entry missing src", () => {
    expect(evidenceSchema.safeParse([{ kind: "image", label: "实机运行", alt: "机器人实机运行画面" }]).success).toBe(false);
  });

  it("rejects an unknown extra field (schema is strict)", () => {
    expect(evidenceSchema.safeParse([{ kind: "image", label: "实机运行", src: "a.webp", alt: "画面", mediaRef: "leftover" }]).success).toBe(false);
  });

  it("accepts a document entry with only value (existing content shape)", () => {
    expect(evidenceSchema.safeParse([{ kind: "document", label: "评估记录", value: "EV-DG-RL-TEST-001" }]).success).toBe(true);
  });

  it("accepts a document entry with only href", () => {
    expect(evidenceSchema.safeParse([{ kind: "document", label: "评估记录", href: "https://example.com/report" }]).success).toBe(true);
  });

  it("rejects a document entry with neither value nor href", () => {
    expect(evidenceSchema.safeParse([{ kind: "document", label: "评估记录" }]).success).toBe(false);
  });

  it("rejects a document entry with an empty-string value", () => {
    expect(evidenceSchema.safeParse([{ kind: "document", label: "评估记录", value: "" }]).success).toBe(false);
  });

  it("rejects a demo entry missing href", () => {
    expect(evidenceSchema.safeParse([{ kind: "demo", label: "在线演示" }]).success).toBe(false);
  });

  it("rejects a video entry missing href", () => {
    expect(evidenceSchema.safeParse([{ kind: "video", label: "演示视频" }]).success).toBe(false);
  });
});
