import path from "node:path";
import { approve, readPublisherPolicy, revoke, sync, verify } from "./service";

const command = process.argv[2];
const args = new Map<string, string>();
for (let index = 3; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (key?.startsWith("--") && value) args.set(key.slice(2), value);
}

const vaultRoot = process.env.VAULT_ROOT;
const policyPath = process.env.PUBLISH_POLICY;
if (!vaultRoot || !policyPath) {
  console.error("Publisher requires VAULT_ROOT and PUBLISH_POLICY; no Vault was accessed.");
  process.exit(1);
}
const paths = { repoRoot: path.resolve(import.meta.dirname, "../.."), vaultRoot: path.resolve(vaultRoot), policyPath: path.resolve(policyPath) };

try {
  if (command === "plan") {
    const policy = await readPublisherPolicy(paths.policyPath);
    console.log(JSON.stringify(policy.entries.map(({ approvalId, collection, slug, sourceSha256, revokedAt }) => ({ approvalId, collection, slug, sourceSha256, revokedAt: revokedAt ?? null })), null, 2));
  } else if (command === "approve") {
    const entry = await approve(paths, args.get("source") ?? "", (args.get("collection") ?? "notes") as "work" | "notes" | "writing", args.get("slug") ?? "");
    console.log(`approved ${entry.approvalId}`);
  } else if (command === "sync") {
    await sync(paths);
    console.log("publisher sync complete");
  } else if (command === "verify") {
    await verify(paths);
    console.log("publisher verification complete");
  } else if (command === "revoke") {
    await revoke(paths, args.get("approval") ?? "", args.get("reason") ?? "");
    console.log("publisher approval revoked");
  } else {
    throw new Error("usage: plan | approve --source <path> --collection <name> --slug <slug> | sync | verify | revoke --approval <id> --reason <text>");
  }
} catch (error) {
  console.error(`PUBLISHER FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
