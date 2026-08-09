import fs from "node:fs/promises";
import path from "node:path";
import { isBlockedPath, isInside, normalizeRelative } from "../policy";

export async function resolveVaultSource(vaultRoot: string, relative: string): Promise<string> {
  const normalized = normalizeRelative(relative);
  if (!normalized || normalized.startsWith("../") || isBlockedPath(normalized)) throw new Error(`${relative}: blocked vault path`);
  const candidate = path.resolve(vaultRoot, normalized);
  if (!isInside(vaultRoot, candidate)) throw new Error(`${relative}: path escape`);
  const [realRoot, realCandidate] = await Promise.all([fs.realpath(vaultRoot), fs.realpath(candidate)]);
  if (!isInside(realRoot, realCandidate)) throw new Error(`${relative}: symlink escape`);
  return realCandidate;
}
