# GUOHAO web

Editorial portfolio and public knowledge layer for robotics, learning systems, and engineering notes.

## Stack

- Astro static output with TypeScript and Tailwind CSS.
- Node.js 24 and pnpm 10.
- Vercel Git integration: Preview for branches, Production for `main`.

## Local commands

```text
pnpm install
pnpm dev
pnpm check
pnpm test
pnpm build
pnpm run ci
pnpm hooks:install
```

`pnpm ci` is reserved by pnpm 10, so the complete project gate is invoked as `pnpm run ci`.

`pnpm build` verifies the checked-in public snapshot before creating `dist/`. The Vercel build never reads a private vault.

The content and audit commands are:

```text
pnpm content:sync     # local-only: generate a reviewed snapshot from the vault
pnpm content:verify   # verify the checked-in snapshot
pnpm audit:public     # scan public files for secrets, PII, paths, and private links
pnpm sync:github      # refresh metadata for the exact repositories in config/public-repos.yml
pnpm run ci           # the complete local delivery gate
```

## Public snapshot flow

The private source is reviewed outside this repository. A versioned allowlist entry stores the source path, collection, slug, content hash, risk tier, and approved asset hashes. The local sync command reads the private policy through `PUBLISH_POLICY`, strips internal metadata, rejects private links and secrets, then writes only a public snapshot into `src/content` and `src/assets`.

```text
private source → allowlist + frontmatter → hash check → public audit → snapshot → build
```

Required source fields:

```yaml
publish: true
visibility: public
title: A public title
summary: A short public summary
date: 2026-08-08
type: note
```

High-risk derived notes also require `publicVersion: true` and `sanitized: true`.

To publish locally, provide the vault and private policy only in the current shell. The sync command fails closed when `VAULT_ROOT` is absent, and it never writes the policy into this repository:

```powershell
$env:VAULT_ROOT = "<private-vault-root>"
$env:PUBLISH_POLICY = "<private-vault-root>\\90_系统\\个人网站发布配置\\publish-allowlist.yml"
pnpm content:sync
pnpm run ci
```

The allowlist records the exact source hash and approved asset hashes. A changed source, missing frontmatter, unresolved Obsidian link, unsafe attachment, or failed scan stops before the public snapshot is replaced. Re-approval means reviewing the changed source, updating its hash in the private policy, and running the same two commands again.

To remove an article from the public site, delete its allowlist entry, run `pnpm content:sync`, review the resulting diff, and then run `pnpm run ci`. The public snapshot is the only deployable content; Vercel cannot recover removed content from the private vault.

## Safety boundary

Do not copy the private vault, approval policy, credentials, local paths, raw diary entries, HR material, internal reports, or unapproved media into this repository. The validator is intentionally fail-closed for secrets, private paths, Obsidian links, forbidden file types, and incomplete Work evidence.

## Vercel

Import this repository as an Astro project with:

```text
Build command: pnpm build
Output directory: dist
Production branch: main
```

Set `PUBLIC_SITE_URL` in the Vercel project when a canonical domain is available. No vault path or GitHub token is needed at build time.

Keep the GitHub repository private until the first full scan and production Preview review. Use `main` as the only production branch; protect Preview deployments with Vercel Standard Protection before sharing them.
