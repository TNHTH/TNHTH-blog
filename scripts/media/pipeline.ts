import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export interface MediaDerivative {
  mediaId: string;
  path: string;
  width: number;
  height: number;
  format: "webp" | "avif";
  sha256: string;
  alt: string;
  caption?: string;
}

export interface MediaOptions {
  mediaId: string;
  alt: string;
  caption?: string;
  maxWidth?: number;
}

async function digest(file: string): Promise<string> {
  return crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");
}

async function assertClean(file: string): Promise<{ width: number; height: number }> {
  const metadata = await sharp(file).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`${file}: derivative dimensions missing`);
  if (metadata.exif || metadata.iptc || metadata.xmp || metadata.tifftagPhotoshop) throw new Error(`${file}: derivative contains private metadata`);
  return { width: metadata.width, height: metadata.height };
}

export async function createDerivative(input: string, outputDirectory: string, options: MediaOptions): Promise<MediaDerivative[]> {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(options.mediaId)) throw new Error("mediaId must be a URL-safe slug");
  if (!options.alt.trim()) throw new Error("alt text is required");
  await fs.mkdir(outputDirectory, { recursive: true });
  const base = sharp(input).rotate().resize({ width: options.maxWidth ?? 1800, withoutEnlargement: true });
  const outputs: MediaDerivative[] = [];
  for (const format of ["webp", "avif"] as const) {
    const output = path.join(outputDirectory, `${options.mediaId}.${format}`);
    await base.clone()[format]({ quality: format === "webp" ? 82 : 65 }).toFile(output);
    const dimensions = await assertClean(output);
    outputs.push({ mediaId: options.mediaId, path: `/assets/${options.mediaId}.${format}`, ...dimensions, format, sha256: await digest(output), alt: options.alt, ...(options.caption ? { caption: options.caption } : {}) });
  }
  return outputs;
}

export async function writeMediaManifest(output: string, entries: MediaDerivative[]): Promise<void> {
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), entries }, null, 2)}\n`, "utf8");
}
