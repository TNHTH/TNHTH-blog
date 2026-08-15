import type { CollectionEntry } from "astro:content";

export type ProjectEntry = CollectionEntry<"projects">;
export type NoteEntry = CollectionEntry<"notes">;

export function assertContentRelationships(projects: ProjectEntry[], notes: NoteEntry[]): void {
  const projectIds = new Set(projects.map((project) => project.id));
  for (const note of notes) {
    for (const projectId of note.data.relatedProjects) {
      if (!projectIds.has(projectId)) throw new Error(`Note ${note.id} references missing project ${projectId}`);
    }
  }
}

export function sortProjects(entries: ProjectEntry[]): ProjectEntry[] {
  return [...entries].sort((a, b) => {
    const featured = Number(b.data.featured) - Number(a.data.featured);
    if (featured) return featured;
    const priority = b.data.priority - a.data.priority;
    if (priority) return priority;
    return (b.data.updated?.valueOf() ?? 0) - (a.data.updated?.valueOf() ?? 0);
  });
}

export function sortNotes(entries: NoteEntry[]): NoteEntry[] {
  return [...entries].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function topicSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
}

export function topicIndex(projects: ProjectEntry[], notes: NoteEntry[]) {
  const index = new Map<string, { name: string; projects: ProjectEntry[]; notes: NoteEntry[] }>();
  const ensure = (name: string) => {
    const slug = topicSlug(name);
    if (!index.has(slug)) index.set(slug, { name, projects: [], notes: [] });
    return index.get(slug)!;
  };
  for (const project of projects) for (const topic of project.data.topics) {
    const entry = ensure(topic);
    if (!entry.projects.includes(project)) entry.projects.push(project);
  }
  for (const note of notes) for (const tag of note.data.tags) {
    const entry = ensure(tag);
    if (!entry.notes.includes(note)) entry.notes.push(note);
  }
  return index;
}

export function relatedNotesForProject(projectId: string, notes: NoteEntry[]): NoteEntry[] {
  return sortNotes(notes.filter((note) => note.data.relatedProjects.includes(projectId))).slice(0, 5);
}

export function relatedProjectsForNote(note: NoteEntry, projects: ProjectEntry[]): ProjectEntry[] {
  return projects.filter((project) => note.data.relatedProjects.includes(project.id));
}

export function relatedNotesForNote(note: NoteEntry, notes: NoteEntry[]): NoteEntry[] {
  const scored = notes.filter((candidate) => candidate.id !== note.id).map((candidate) => {
    const sharedTags = candidate.data.tags.filter((tag) => note.data.tags.includes(tag)).length;
    const sharedProject = candidate.data.relatedProjects.some((id) => note.data.relatedProjects.includes(id));
    const sameSeries = Boolean(note.data.series && candidate.data.series && note.data.series === candidate.data.series);
    return { candidate, score: (sameSeries ? 100 : 0) + (sharedProject ? 50 : 0) + sharedTags * 15 };
  });
  return scored.filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, 5).map(({ candidate }) => candidate);
}

export interface GalaxyNode { id: string; label: string; kind: "center" | "project" | "topic" | "note"; x: number; y: number; href?: string; }
export interface GalaxyEdge { source: string; target: string; }

export function buildGalaxyModel(projects: ProjectEntry[], notes: NoteEntry[]) {
  const nodes: GalaxyNode[] = [{ id: "center", label: "郭伟浩", kind: "center", x: 50, y: 50 }];
  const edges: GalaxyEdge[] = [];
  const featuredProjects = sortProjects(projects).slice(0, 6);
  const topics = [...topicIndex(projects, notes).values()].sort((a, b) => (b.projects.length + b.notes.length) - (a.projects.length + a.notes.length)).slice(0, 8);
  const sampleNotes = sortNotes(notes).slice(0, 10);
  featuredProjects.forEach((project, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(featuredProjects.length, 1);
    const node = { id: `project:${project.id}`, label: project.data.title, kind: "project" as const, x: 50 + Math.cos(angle) * 29, y: 50 + Math.sin(angle) * 25, href: `/projects/${project.id}` };
    nodes.push(node); edges.push({ source: "center", target: node.id });
    project.data.topics.slice(0, 3).forEach((topic) => edges.push({ source: node.id, target: `topic:${topicSlug(topic)}` }));
  });
  topics.forEach((topic, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(topics.length, 1) + 0.35;
    nodes.push({ id: `topic:${topicSlug(topic.name)}`, label: topic.name, kind: "topic", x: 50 + Math.cos(angle) * 40, y: 50 + Math.sin(angle) * 37, href: `/topics/${topicSlug(topic.name)}` });
  });
  sampleNotes.forEach((note, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(sampleNotes.length, 1) + 0.15;
    const node = { id: `note:${note.id}`, label: note.data.title, kind: "note" as const, x: 50 + Math.cos(angle) * 46, y: 50 + Math.sin(angle) * 43, href: `/notes/${note.id}` };
    nodes.push(node); note.data.tags.slice(0, 2).forEach((tag) => edges.push({ source: node.id, target: `topic:${topicSlug(tag)}` }));
  });
  return { nodes, edges: edges.filter((edge) => nodes.some((node) => node.id === edge.source) && nodes.some((node) => node.id === edge.target)) };
}
