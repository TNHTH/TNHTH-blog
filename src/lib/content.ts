import type { CollectionEntry } from "astro:content";
import { GALAXY_LAYOUT } from "./galaxy-layout";

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

export type GalaxyEdgeKind = "core" | "project-topic" | "note-project" | "note-topic";
export interface GalaxyNode { id: string; label: string; kind: "center" | "project" | "topic" | "note"; x: number; y: number; href?: string; }
export interface GalaxyEdge { source: string; target: string; kind: GalaxyEdgeKind; }

export function buildGalaxyModel(projects: ProjectEntry[], notes: NoteEntry[]) {
  const layout = GALAXY_LAYOUT;
  const featuredProjects = sortProjects(projects).slice(0, 6);
  const allTopics = topicIndex(projects, notes);
  const topics = [...allTopics.values()].sort((a, b) => (b.projects.length + b.notes.length) - (a.projects.length + a.notes.length)).slice(0, 8);
  const sampleNotes = sortNotes(notes).slice(0, 10);
  const nodes: GalaxyNode[] = [{ id: "center", label: "郭伟浩", kind: "center", x: layout.centerX, y: layout.centerY }];

  featuredProjects.forEach((project, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(featuredProjects.length, 1);
    nodes.push({ id: `project:${project.id}`, label: project.data.title, kind: "project", x: layout.centerX + Math.cos(angle) * layout.projectRx, y: layout.centerY + Math.sin(angle) * layout.projectRy, href: `/projects/${project.id}` });
  });

  topics.forEach((topic, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(topics.length, 1) + 0.35;
    nodes.push({ id: `topic:${topicSlug(topic.name)}`, label: topic.name, kind: "topic", x: layout.centerX + Math.cos(angle) * layout.topicRx, y: layout.centerY + Math.sin(angle) * layout.topicRy, href: `/topics/${topicSlug(topic.name)}` });
  });

  sampleNotes.forEach((note, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(sampleNotes.length, 1) + 0.15;
    nodes.push({ id: `note:${note.id}`, label: note.data.title, kind: "note", x: layout.centerX + Math.cos(angle) * layout.noteRx, y: layout.centerY + Math.sin(angle) * layout.noteRy, href: `/notes/${note.id}` });
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edgeKeys = new Set<string>();
  const edges: GalaxyEdge[] = [];
  const addEdge = (source: string, target: string, kind: GalaxyEdgeKind) => {
    const key = `${source}→${target}`;
    if (nodeIds.has(source) && nodeIds.has(target) && !edgeKeys.has(key)) {
      edgeKeys.add(key);
      edges.push({ source, target, kind });
    }
  };

  for (const project of featuredProjects) {
    const projectId = `project:${project.id}`;
    addEdge("center", projectId, "core");
    for (const topic of project.data.topics.slice(0, 3)) addEdge(projectId, `topic:${topicSlug(topic)}`, "project-topic");
  }
  for (const note of sampleNotes) {
    const noteId = `note:${note.id}`;
    for (const projectId of note.data.relatedProjects) addEdge(noteId, `project:${projectId}`, "note-project");
    for (const tag of note.data.tags.slice(0, 2)) addEdge(noteId, `topic:${topicSlug(tag)}`, "note-topic");
  }

  return { nodes, edges };
}
