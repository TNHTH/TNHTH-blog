import DOMPurify from "dompurify";
import { marked } from "marked";
import { parsePublicDocument, publicStatusLabels } from "../lib/public-content";

const rawBase = "https://raw.githubusercontent.com/TNHTH/TNHTH-blog/main";

async function fetchRaw(path: string): Promise<string> {
  const response = await fetch(`${rawBase}/${path}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.text();
}

function setText(root: ParentNode, selector: string, value: unknown): void {
  root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    element.textContent = String(value ?? "");
  });
}

function setTags(root: ParentNode, tags: unknown): void {
  if (!Array.isArray(tags)) return;
  root.querySelectorAll<HTMLElement>("[data-live-tags]").forEach((container) => {
    container.replaceChildren(...tags.map((tag) => {
      const item = document.createElement("span");
      item.className = "border border-[var(--line)] px-2 py-1";
      item.textContent = String(tag);
      return item;
    }));
  });
}

async function syncProfile(): Promise<void> {
  const profile = JSON.parse(await fetchRaw("src/data/profile.json")) as Record<string, unknown>;
  document.querySelectorAll<HTMLElement>("[data-profile]").forEach((element) => {
    const key = element.dataset.profile;
    if (key && profile[key] !== undefined) element.textContent = String(profile[key]);
  });
  document.querySelectorAll<HTMLAnchorElement>("[data-profile-href]").forEach((element) => {
    const key = element.dataset.profileHref;
    if (key && typeof profile[key] === "string") element.href = profile[key];
  });
}

async function syncCard(card: HTMLElement): Promise<void> {
  const path = card.dataset.livePath;
  if (!path) return;
  const { data } = parsePublicDocument(await fetchRaw(path));
  setText(card, "[data-live-title]", data.title);
  setText(card, "[data-live-summary]", data.summary);
  setText(card, "[data-live-status]", publicStatusLabels[String(data.status)] ?? data.status);
  if (data.date) {
    const date = new Date(String(data.date));
    if (!Number.isNaN(date.valueOf())) setText(card, "[data-live-date]", date.toLocaleDateString("zh-CN", { year: "numeric", month: "long" }));
  }
  setTags(card, data.tags);
}

async function syncDocument(article: HTMLElement): Promise<void> {
  const path = article.dataset.livePath;
  if (!path) return;
  const { data, body } = parsePublicDocument(await fetchRaw(path));
  setText(article, "[data-live-title]", data.title);
  setText(article, "[data-live-summary]", data.summary);
  setText(article, "[data-live-category]", data.category);
  setText(article, "[data-live-status]", publicStatusLabels[String(data.status)] ?? data.status);
  setText(article, "[data-live-role]", data.role);
  setTags(article, data.tags);
  const bodyElement = article.querySelector<HTMLElement>("[data-live-body]");
  if (bodyElement) bodyElement.innerHTML = DOMPurify.sanitize(await marked.parse(body));
  const repoLink = article.querySelector<HTMLAnchorElement>("[data-live-repo]");
  if (repoLink && typeof data.repo === "string") repoLink.href = data.repo;
  document.title = `${String(data.title ?? "内容")} · TNHTH-blog`;
}

async function start(): Promise<void> {
  const tasks: Promise<void>[] = [syncProfile()];
  document.querySelectorAll<HTMLElement>("[data-live-card]").forEach((card) => tasks.push(syncCard(card)));
  document.querySelectorAll<HTMLElement>("[data-live-document]").forEach((article) => tasks.push(syncDocument(article)));
  const results = await Promise.allSettled(tasks);
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length) console.warn("实时公开内容同步失败，已保留构建时快照。", failures);
}

if (import.meta.env.PROD) void start();
