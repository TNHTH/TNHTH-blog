import { describe, expect, it } from "vitest";
import { buildGalaxyModel, type NoteEntry, type ProjectEntry } from "../src/lib/content";

const project = (id: string, title: string): ProjectEntry => ({
  id,
  body: "",
  collection: "projects",
  data: {
    title,
    summary: "summary",
    outcome: "outcome",
    status: "active",
    period: "2026",
    topics: ["机器人", "强化学习"],
    updated: new Date("2026-01-01"),
    featured: true,
    priority: 1,
    evidence: [],
    contributions: [],
    tech: [],
  },
});

const note = (id: string): NoteEntry => ({
  id,
  body: "正文",
  collection: "notes",
  data: {
    title: "奖励函数设计",
    date: new Date("2026-01-02"),
    tags: ["强化学习", "实验"],
    relatedProjects: ["dashgo"],
  },
});

describe("Galaxy model", () => {
  it("keeps note-to-project and note-to-topic relationships visible", () => {
    const model = buildGalaxyModel([project("dashgo", "DashGo")], [note("reward-design")]);
    expect(model.nodes.find((node) => node.id === "center")).toMatchObject({ x: 64, y: 48 });
    expect(model.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "note:reward-design", target: "project:dashgo", kind: "note-project" }),
      expect.objectContaining({ source: "note:reward-design", target: "topic:强化学习", kind: "note-topic" }),
    ]));
  });
});
