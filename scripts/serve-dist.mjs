import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = decoded.replace(/^\/+/, "");
  const candidate = path.resolve(root, relative);
  return candidate === root || candidate.startsWith(`${root}${path.sep}`) ? candidate : null;
}

async function resolveFile(urlPath) {
  const requested = safePath(urlPath);
  if (!requested) return null;
  const candidates = [requested];
  if (!path.extname(requested)) candidates.push(path.join(requested, "index.html"), `${requested}.html`);
  if (urlPath.endsWith("/")) candidates.unshift(path.join(requested, "index.html"));
  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {}
  }
  return null;
}

const server = createServer(async (request, response) => {
  try {
    const file = await resolveFile(request.url || "/");
    if (!file) {
      const notFound = path.join(root, "404.html");
      response.statusCode = 404;
      response.setHeader("content-type", "text/html; charset=utf-8");
      createReadStream(notFound).pipe(response);
      return;
    }
    response.statusCode = 200;
    response.setHeader("content-type", contentTypes[path.extname(file).toLowerCase()] || "application/octet-stream");
    createReadStream(file).pipe(response);
  } catch (error) {
    response.statusCode = 500;
    response.end(error instanceof Error ? error.message : "Internal server error");
  }
});

await access(root);
server.listen(port, "127.0.0.1", () => console.log(`portable dist server: http://127.0.0.1:${port}`));
