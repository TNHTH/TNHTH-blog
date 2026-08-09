import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createDerivative } from "../scripts/media/pipeline";
import { scanMediaFiles, scanTextFiles } from "../scripts/privacy/scan";

async function tempRoot(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "tnhth-media-"));
}

describe("sanitized media pipeline", () => {
  it("removes image metadata before writing webp and avif", async () => {
    const root = await tempRoot();
    const input = path.join(root, "private.jpg");
    const output = path.join(root, "src", "assets");
    await sharp({ create: { width: 24, height: 16, channels: 3, background: { r: 180, g: 120, b: 80 } } })
      .withMetadata({ exif: { IFD0: { Artist: "Private" }, GPS: { GPSLatitude: "1,2,3" } } as never })
      .jpeg()
      .toFile(input);
    const entries = await createDerivative(input, output, { mediaId: "fixture", alt: "Fixture image" });
    expect(entries.map((entry) => entry.format)).toEqual(["webp", "avif"]);
    for (const entry of entries) expect((await sharp(path.join(output, path.basename(entry.path))).metadata()).exif).toBeUndefined();
    await expect(scanMediaFiles(root)).resolves.toBe(2);
  });

  it("rejects source fields in the public media manifest", async () => {
    const root = await tempRoot();
    const manifest = path.join(root, "src", "data", "generated");
    await fs.mkdir(manifest, { recursive: true });
    await fs.writeFile(path.join(manifest, "media-manifest.json"), JSON.stringify({ version: 1, generatedAt: "2026-08-10T00:00:00.000Z", entries: [{ mediaId: "x", path: "/assets/x.webp", width: 1, height: 1, format: "webp", sha256: "a", alt: "x", sourcePath: "vault/source.jpg" }] }), "utf8");
    await expect(scanTextFiles(root)).rejects.toThrow("sourcePath");
  });
});
