import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(import.meta.dirname, "..");
const date = new Date().toISOString().slice(0, 10);
const statePath = path.join(repoRoot, ".tmp", "codex", date, "implementation-state.json");
const phase = Number(process.argv[2]);
const nextPhaseArgument = process.argv[3] ?? String(phase + 1);
const nextPhase = nextPhaseArgument === "none" ? null : Number(nextPhaseArgument);
const status = process.argv[4] ?? "running";
if (!Number.isInteger(phase) || phase < 0 || phase > 6) throw new Error("usage: update-implementation-state <completedPhase> [nextPhase] [status]");
const { stdout: head } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: repoRoot });
const { stdout: branch } = await execFileAsync("git", ["branch", "--show-current"], { cwd: repoRoot });
let previous: Record<string, unknown> = {};
try { previous = JSON.parse(await fs.readFile(statePath, "utf8")); } catch {}
await fs.mkdir(path.dirname(statePath), { recursive: true });
await fs.writeFile(statePath, `${JSON.stringify({ baseline: previous.baseline ?? head.trim(), branch: branch.trim(), lastCompletedPhase: phase, lastCommit: head.trim(), nextPhase, status }, null, 2)}\n`, "utf8");
console.log(`implementation state updated: ${statePath}`);
