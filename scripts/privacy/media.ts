import path from "node:path";
import { scanMediaFiles } from "./scan";

const root = path.resolve(import.meta.dirname, "../..");
scanMediaFiles(root)
  .then((count) => console.log(`media privacy scan passed: ${count} files`))
  .catch((error) => {
    console.error(`MEDIA PRIVACY FAILED: ${error.message}`);
    process.exitCode = 1;
  });
