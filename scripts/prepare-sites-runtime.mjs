import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const distRoot = path.join(projectRoot, "dist");
const serverRoot = path.join(distRoot, "server");

await mkdir(serverRoot, { recursive: true });

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

async function collectAssets(root, current = root) {
  const assets = [];
  for (const item of await readdir(current, { withFileTypes: true })) {
    const full = path.join(current, item.name);
    const relative = path.relative(root, full).replaceAll("\\", "/");
    if (relative === "server" || relative.startsWith("server/") || relative === ".openai" || relative.startsWith(".openai/")) continue;
    if (item.isDirectory()) assets.push(...await collectAssets(root, full));
    else assets.push({
      path: `/${relative}`,
      body: (await readFile(full)).toString("base64"),
      type: mimeTypes[path.extname(full).toLowerCase()] || "application/octet-stream",
    });
  }
  return assets;
}

const assets = await collectAssets(distRoot);
const runtime = `const assets = ${JSON.stringify(Object.fromEntries(assets.map((asset) => [asset.path, { body: asset.body, type: asset.type }])))};

function candidatePaths(pathname) {
  const normalized = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const candidates = [pathname || "/index.html"];
  if (!pathname.includes(".")) {
    candidates.push((normalized || "") + "/index.html");
    candidates.push((normalized || "") + ".html");
  }
  return [...new Set(candidates)];
}

function decode(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export default {
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    }
    const pathname = new URL(request.url).pathname;
    const key = candidatePaths(pathname).find((candidate) => assets[candidate]);
    if (!key) return new Response("Not found", { status: 404 });
    const asset = assets[key];
    return new Response(request.method === "HEAD" ? null : decode(asset.body), {
      headers: { "content-type": asset.type, "cache-control": key.endsWith(".html") ? "no-cache" : "public, max-age=31536000, immutable" },
    });
  },
};
`;

await writeFile(path.join(serverRoot, "index.js"), runtime, "utf8");
let projectId = process.env.OPENAI_SITES_PROJECT_ID;
try {
  const localHosting = JSON.parse(await readFile(path.join(projectRoot, ".openai", "hosting.json"), "utf8"));
  if (typeof localHosting.project_id === "string" && localHosting.project_id) projectId = localHosting.project_id;
} catch {
  // Public CI and remote Sites builds do not need a local project binding.
}

const distHosting = path.join(distRoot, ".openai");
if (projectId) {
  await mkdir(distHosting, { recursive: true });
  await writeFile(path.join(distHosting, "hosting.json"), JSON.stringify({ project_id: projectId }, null, 2) + "\n", "utf8");
} else {
  await rm(distHosting, { recursive: true, force: true });
}

console.log("Sites runtime prepared: dist/server/index.js");
