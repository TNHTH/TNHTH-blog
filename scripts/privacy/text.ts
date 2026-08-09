import path from "node:path";
import { scanTextFiles } from "./scan";

const root = path.resolve(import.meta.dirname, "../..");
scanTextFiles(root)
  .then((count) => console.log(`text privacy scan passed: ${count} files`))
  .catch((error) => {
    console.error(`TEXT PRIVACY FAILED: ${error.message}`);
    process.exitCode = 1;
  });
