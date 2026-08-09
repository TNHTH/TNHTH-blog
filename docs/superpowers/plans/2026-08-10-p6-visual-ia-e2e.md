# Plan 6：Visual + IA + E2E

## Goal

形成完整个人研究主页，覆盖首页、Work、Notes、Writing、Gallery、About、Admin 与 404，并在 390/768/1440 验证。

## Prerequisites

- Plans 1–5 完成。
- 页面使用 build-time snapshot，不新增运行时内容请求。

## Files

- `src/pages/**`
- `src/components/**`
- `src/layouts/BaseLayout.astro`
- `src/styles/global.css`
- `tests/e2e/**`
- `playwright.config.ts`

## Tasks

实现固定首页叙事顺序、Work detail 条件字段、响应式导航、Gallery lightbox、SEO/a11y、动态 fixture slug E2E 和 rollback drill 文档。

## Tests First

Playwright 覆盖主要路由、2xx/canonical、无 Raw 请求、无死链、键盘 lightbox、移动端导航和主题。

## Implementation

Research Editorial × Robotics Engineering；本地 CJK/system 字体栈；目标 Lighthouse ≥90，<80 为 P1 blocker。

## Acceptance Gate

Unit/Integration/E2E/Build 通过，390/768/1440 无严重断版，所有公开页没有私有来源字段。

## Rollback

只在 preview/staging/临时分支演练 candidate → previous deployment，不向 production main 注入坏提交。

## Expected Commit

`feat: complete portfolio visual system and e2e`
