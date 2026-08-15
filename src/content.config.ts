import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const source = z.object({
  title: z.string().min(1),
  author: z.string().optional(),
  url: z.url().optional(),
});

const externalLink = z.object({ label: z.string().min(1), url: z.url() });

const evidence = z.object({
  kind: z.enum(["image", "video", "demo", "metric", "document"]),
  label: z.string().min(1),
  value: z.string().optional(),
  src: z.string().optional(),
  href: z.url().optional(),
  alt: z.string().optional(),
});

const project = defineCollection({
  loader: glob({ base: "./src/content/projects", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    outcome: z.string().min(1),
    status: z.enum(["prototype", "active", "completed", "archived"]),
    period: z.string().min(1),
    topics: z.array(z.string()).default([]),
    updated: z.coerce.date().optional(),
    featured: z.boolean().default(false),
    priority: z.number().int().default(0),
    role: z.string().optional(),
    evidence: z.array(evidence).default([]),
    contributions: z.array(z.string()).default([]),
    tech: z.array(z.string()).default([]),
    repo: z.url().optional(),
    demo: z.url().optional(),
  }),
});

const note = defineCollection({
  loader: glob({ base: "./src/content/notes", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    source: source.optional(),
    relatedProjects: z.array(z.string()).default([]),
    series: z.string().optional(),
    location: z.string().optional(),
    equipment: z.array(z.string()).optional(),
    weather: z.string().optional(),
    course: z.string().optional(),
    externalLinks: z.array(externalLink).optional(),
  }),
});

export const collections = { projects: project, notes: note };
