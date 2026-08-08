import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

interface RepoConfig { owner: string; name: string; title: string; category: string; }
interface GitHubRepo { html_url: string; description: string | null; language: string | null; stargazers_count: number; forks_count: number; topics?: string[]; pushed_at: string; }

const root = path.resolve(import.meta.dirname, "..");
const configPath = path.join(root, "config", "public-repos.yml");
const outputPath = path.join(root, "src", "data", "generated", "github.json");

async function main(): Promise<void> {
  const config = parse(await fs.readFile(configPath, "utf8")) as { repos: RepoConfig[] };
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const output = [];
  for (const item of config.repos) {
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(item.owner)}/${encodeURIComponent(item.name)}`, { headers });
    if (!response.ok) throw new Error(`${item.owner}/${item.name}: GitHub API ${response.status}`);
    const repo = await response.json() as GitHubRepo;
    output.push({
      repo: `${item.owner}/${item.name}`,
      title: item.title,
      category: item.category,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      topics: repo.topics ?? [],
      url: repo.html_url,
      updatedAt: repo.pushed_at,
    });
  }
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), repos: output }, null, 2)}\n`, "utf8");
  console.log(`github snapshot generated: ${output.length} repositories`);
}

main().catch((error) => { console.error(`GITHUB SYNC FAILED: ${error.message}`); process.exitCode = 1; });
