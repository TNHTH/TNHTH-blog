import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const base = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  cover: z.string().optional(),
});

const work = defineCollection({
  loader: glob({ base: "./src/content/work", pattern: "**/*.md" }),
  schema: base.extend({
    type: z.literal("project"),
    status: z.enum(["ongoing", "partial", "reproduction", "complete"]),
    role: z.string().min(1),
    contribution: z.array(z.string()).min(1),
    evidence: z.array(z.string()).default([]),
    repo: z.url().optional(),
    featured: z.boolean().default(false),
    problem: z.string().optional(),
    context: z.string().optional(),
    constraints: z.array(z.string()).default([]),
    result: z.string().optional(),
    limitations: z.array(z.string()).default([]),
  }),
});

const notes = defineCollection({
  loader: glob({ base: "./src/content/notes", pattern: "**/*.md" }),
  schema: base.extend({ type: z.literal("note"), category: z.string().min(1) }),
});

const writing = defineCollection({
  loader: glob({ base: "./src/content/writing", pattern: "**/*.md" }),
  schema: base.extend({ type: z.literal("writing"), category: z.string().min(1) }),
});

export const collections = { work, notes, writing };
