import path from "node:path";
import { createDerivative, writeMediaManifest, type MediaDerivative } from "./pipeline";

const root = path.resolve(import.meta.dirname, "../..");
const inputDirectory = process.env.MEDIA_INPUT_DIR;
const outputDirectory = process.env.MEDIA_OUTPUT_DIR ?? path.join(root, "src", "assets");
const manifestPath = process.env.MEDIA_MANIFEST ?? path.join(root, "src", "data", "generated", "media-manifest.json");

if (!inputDirectory) {
  console.error("MEDIA_INPUT_DIR is required; no media source was accessed.");
  process.exit(1);
}

const entries: MediaDerivative[] = [];
try {
  const { readdir } = await import("node:fs/promises");
  for (const file of await readdir(inputDirectory)) {
    if (!/\.(jpe?g|png|webp|avif)$/i.test(file)) continue;
    const mediaId = file.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    entries.push(...await createDerivative(path.join(inputDirectory, file), outputDirectory, { mediaId, alt: mediaId.replaceAll("-", " ") }));
  }
  await writeMediaManifest(manifestPath, entries);
  console.log(`media derivatives generated: ${entries.length}`);
} catch (error) {
  console.error(`MEDIA BUILD FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
