import fs from "node:fs/promises";

export interface TransactionOptions {
  stagedContent: string;
  stagedAssets: string;
  contentDestination: string;
  assetsDestination: string;
  failAt?: "content" | "assets";
}

export async function replaceContentAndAssets(options: TransactionOptions): Promise<void> {
  const destinations = [options.contentDestination, options.assetsDestination];
  const staged = [options.stagedContent, options.stagedAssets];
  const backups = destinations.map((destination, index) => `${destination}.previous-${process.pid}-${index}`);
  const moved = [false, false];
  try {
    for (let index = 0; index < destinations.length; index += 1) {
      await fs.rm(backups[index], { recursive: true, force: true });
      try {
        await fs.rename(destinations[index], backups[index]);
        moved[index] = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    if (options.failAt === "content") throw new Error("fault injection: content replace");
    await fs.rename(staged[0], destinations[0]);
    if (options.failAt === "assets") throw new Error("fault injection: assets replace");
    await fs.rename(staged[1], destinations[1]);
  } catch (error) {
    for (const destination of destinations) await fs.rm(destination, { recursive: true, force: true });
    for (let index = destinations.length - 1; index >= 0; index -= 1) {
      if (moved[index]) await fs.rename(backups[index], destinations[index]);
    }
    throw error;
  }
  for (const backup of backups) await fs.rm(backup, { recursive: true, force: true });
}
