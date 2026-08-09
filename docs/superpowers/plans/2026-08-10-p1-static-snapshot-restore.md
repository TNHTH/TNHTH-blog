# Plan 1：Static Snapshot Restore

## Goal

让生产站只由 Astro build-time content collections 生成静态快照，不在浏览器运行时读取 GitHub Raw/API。

## Prerequisites

- `src/content.config.ts` 与公开内容存在。
- `PUBLIC_SITE_URL` 可由 shell、CI 或本地 `.env` 提供。

## Files

- `astro.config.mjs`
- `src/layouts/BaseLayout.astro`
- `src/components/ContentList.astro`
- `src/components/ProjectRow.astro`
- `src/pages/**`
- `package.json`

## Tasks

1. 固定 `output: "static"`，用 Vite `loadEnv()` 读取本地 `.env`。
2. 删除 `data-live`、Raw fetch、Sites server runtime 与 postbuild 钩子。
3. 保留 Astro content collections 作为页面内容唯一构建来源。

## Tests First

- 搜索 `data-live`、`raw.githubusercontent.com`、`prepare-sites-runtime`。
- `PUBLIC_SITE_URL=https://example.invalid pnpm check`。

## Implementation

页面模板直接消费 `getCollection()` 与 `render()` 结果，构建产物仅包含静态 HTML、资源和 sitemap。

## Acceptance Gate

- `dist/server` 不存在。
- `src/` 与 `dist/` 无 runtime 内容拉取引用。
- `pnpm check` 与 `pnpm build` 通过。

## Rollback

恢复本 Plan 变更涉及的页面模板和构建配置；不恢复已删除的旧生产 runtime。

## Expected Commit

`feat: restore static snapshot deployment`
