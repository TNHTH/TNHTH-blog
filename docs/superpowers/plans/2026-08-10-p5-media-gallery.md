# Plan 5：Media Pipeline + Gallery

## Goal

本地生成清理元数据后的 WebP/AVIF derivative，并提供空态与数据态都可用的 Gallery。

## Prerequisites

- Plan 2 完成；Plan 3 的 approval/asset 边界可复用。

## Files

- `scripts/media/**`
- `src/pages/gallery/index.astro`
- `src/data/generated/media-manifest.json`
- `tests/media/**`

## Tasks

Sharp decode → orientation → resize → strip metadata → WebP/AVIF → reopen → metadata scan → SHA-256 → public derivative；原图不得进入 Git。

## Tests First

使用带 GPS 的 fixture 验证 derivative 没有 GPS/EXIF/XMP/IPTC；验证 manifest 私有字段负向用例。

## Implementation

Gallery 使用 Astro HTML 和少量原生客户端 JS，提供响应式网格、键盘可访问 lightbox、Escape、focus 管理和空态。

## Acceptance Gate

`pnpm test`、`pnpm check`、`pnpm build` 通过，且 Git tracked files 不含私人原图。

## Rollback

删除 derivative 与 manifest，恢复上一份公开媒体快照；保留私人原图在 Vault 外部。

## Expected Commit

`feat: add sanitized media pipeline and gallery`
