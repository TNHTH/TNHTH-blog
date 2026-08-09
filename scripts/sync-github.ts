import path from "node:path";
import { syncGitHub } from "./github/sync";

syncGitHub({ root: path.resolve(import.meta.dirname, "..") })
  .then((snapshot) => console.log(`github snapshot ${snapshot.stale ? "stale" : "updated"}: ${snapshot.repos.length} repositories`))
  .catch((error) => {
    console.error(`GITHUB SYNC FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
