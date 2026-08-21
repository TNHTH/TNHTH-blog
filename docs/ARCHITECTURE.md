# TNHTH-blog Architecture

## Runtime

Astro static output, TypeScript, Tailwind CSS 4 through the Vite plugin, Astro Content Collections with Zod, Pagefind, Vitest, and Playwright. `pnpm build` produces a portable `dist/` containing the site and Pagefind index.

Production deployment is handled by Vercel after the validated static build; `pnpm build` does not read private vault data or invoke deployment tooling.

## Routes

```text
/
/projects
/projects/[slug]
/notes
/notes/[slug]
/topics/[slug]
/about
/404
```

Legacy `/work/*`, `/writing/*`, and `/gallery` routes remain compatible until the migration ledger and redirect tests prove that every public URL has a target or an explicit handling record.

## Data flow

```text
public content
→ Zod schema
→ build-time relationships/topics
→ Astro pages
→ static dist
→ Pagefind index
```

`Note.relatedProjects` is the canonical relationship. Project related notes are derived at build time. `reference("projects")` is preferred when compatible with the existing loader; an equivalent build-time validator is acceptable.

## Publishing boundary

The repository contains only reviewed public snapshots. A generated proposal is not an approval. The human-controlled allowlist is the approval source. `apply` reloads the allowlist, re-hashes sources, reruns content/privacy/media validation, builds a staging snapshot, validates it, and atomically replaces the public snapshot.

Publisher operations are dry-run capable and idempotent. Public media is decoded, oriented, resized, re-encoded, and scanned for EXIF, GPS, XMP, IPTC, and embedded thumbnails.

## Verification boundary

- `content:verify`: real public data, migration invariants, references, privacy, and assets.
- `test`: implementation behavior with fixtures.
- `build`: deployment artifact only.
- `ci`: verify + build + E2E.
- Internal links and local assets block release. External links are non-blocking checks.
