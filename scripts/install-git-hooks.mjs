import { execFileSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
execFileSync("git", ["config", "core.hooksPath", path.join(root, ".githooks")], { cwd: root, stdio: "inherit" });
console.log("git hooks configured");
