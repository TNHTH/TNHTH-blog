# TNHTH-blog V1 implementation report

日期：2026-08-10

## Architecture status

- Astro remains the build system and is explicitly configured for `output: "static"`.
- The browser no longer loads content from GitHub Raw/API; pages consume Astro content collections at build time.
- The old Sites runtime, `postbuild` generator, local Sites binding, and `sites` git remote were removed from the active delivery path.
- `PUBLIC_SITE_URL` is required and is loaded from process environment or local `.env` through Vite `loadEnv()`.

## Plan status

| Plan | Status | Evidence |
| --- | --- | --- |
| 1 Static Snapshot Restore | Complete | `src/` has no `data-live` or Raw fetch; static build succeeds; `dist/server` is absent |
| 2 Safety + CI | Complete | split text/media scanners, public manifest audit, Actions v6, read-only CI permissions |
| 3 Publisher V2 | Complete | five CLI commands, strict version 2 policy, approval/revoke/provenance, transactional rollback tests |
| 4 GitHub Sync V2 | Complete | explicit allowlist, ETag/304, retry/backoff, stale fallback, atomic snapshot, PR workflow |
| 5 Media + Gallery | Complete | Sharp WebP/AVIF derivatives, metadata negative tests, empty-state and accessible lightbox UI |
| 6 Visual + IA + E2E | Complete | complete homepage IA, conditional Work detail fields, responsive/a11y E2E at 390/768/1440 |

## Safety status

- Publisher tests use temporary Fake Vaults only.
- Real Vault access requires explicit `VAULT_ROOT` and `PUBLISH_POLICY`; no test reads a real Vault.
- Public manifest entries contain only approval ID, collection, slug, snapshot hash, and policy version.
- Media manifest entries contain only public derivative metadata; source path, original filename, source hash, GPS, EXIF, XMP, IPTC, and device metadata are rejected.
- Text and media scanners are separate. Binary media is never decoded as UTF-8 text.

## Verification

The following final commands passed on 2026-08-10 with `PUBLIC_SITE_URL=https://example.invalid`:

```text
pnpm content:verify
pnpm privacy:text
pnpm privacy:media
pnpm audit:public
pnpm check
pnpm test                 # 5 files, 20 tests
pnpm build                # 15 static pages
pnpm test:e2e             # 5 tests passed
```

The Playwright checks cover primary routes, a dynamically discovered Work detail slug, canonical URLs, absence of Raw/API requests, mobile navigation, theme toggle, 404, Gallery empty state, and no horizontal overflow at 390, 768, and 1440 pixels.

## CI and deployment

- `.github/workflows/ci.yml` uses checkout/setup-node/pnpm-action v6 and `contents: read`.
- `.github/workflows/e2e.yml` runs browser acceptance with Chromium.
- `.github/workflows/github-sync.yml` has isolated write permissions and creates a pull request through `peter-evans/create-pull-request`; it never pushes `main`.
- Vercel deployment is not completed because the local Vercel CLI is unavailable. See [Vercel finalize steps](../manual/vercel-finalize.md).

## Git

- Branch: `codex/tnhth-v1-implementation`
- GitHub remote: `origin` only
- No private Vault, publish allowlist, credentials, or original media is tracked.

## Release gate

The local code, safety checks, tests, build, CI definitions, and browser verification satisfy the implementation gate. The remaining external gate is Vercel account authorization/project import and setting the resulting `*.vercel.app` URL as `PUBLIC_SITE_URL`.
