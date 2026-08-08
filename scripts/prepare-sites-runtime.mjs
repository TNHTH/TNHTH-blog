import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const distRoot = path.join(projectRoot, "dist");
const serverRoot = path.join(distRoot, "server");

await mkdir(serverRoot, { recursive: true });

const runtime = `import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

const distRoot = path.resolve(process.env.SITE_DIST_ROOT || path.join(process.cwd(), "dist"));
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
  ".xml": "application/xml; charset=utf-8"
};

function safePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  const relative = pathname.replace(/^\\/+/, "") || "index.html";
  const candidate = path.resolve(distRoot, relative);
  if (candidate !== distRoot && !candidate.startsWith(distRoot + path.sep)) return null;
  return candidate;
}

async function findFile(requestUrl) {
  const candidate = safePath(requestUrl);
  if (!candidate) return null;
  const candidates = [candidate];
  if (!path.extname(candidate)) candidates.push(path.join(candidate, "index.html"), candidate + ".html");
  for (const file of candidates) {
    try {
      const info = await stat(file);
      if (info.isFile()) return file;
    } catch {}
  }
  return null;
}

const server = createServer(async (request, response) => {
  if (!request.url || !["GET", "HEAD"].includes(request.method ?? "GET")) {
    response.writeHead(405, { "allow": "GET, HEAD" });
    response.end();
    return;
  }
  let file;
  try {
    file = await findFile(request.url);
  } catch {
    file = null;
  }
  if (!file) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  const contentType = mimeTypes[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  const info = await stat(file);
  response.writeHead(200, { "content-type": contentType, "content-length": info.size });
  if (request.method === "HEAD") response.end();
  else createReadStream(file).pipe(response);
});

const port = Number(process.env.PORT || 3000);
server.listen(port, "0.0.0.0");
`;

await writeFile(path.join(serverRoot, "index.js"), runtime, "utf8");
await mkdir(path.join(distRoot, ".openai"), { recursive: true });
await writeFile(
  path.join(distRoot, ".openai", "hosting.json"),
  JSON.stringify({ project_id: "appgprj_6a774e6938688191806a66573cff9a80" }, null, 2) + "\n",
  "utf8",
);

console.log("Sites runtime prepared: dist/server/index.js");
