# 旧分支审计

日期：2026-10-12

Canonical 分支是 `main`（`1a6f46dea828835af40464b70adc3d190bde7663`）。下面三支仍然分叉，整支合并会退回旧站，因此不进入 `main`。

## main 上已有的文章

- `src/content/projects/dashgo-rl-navigation.md`
- `src/content/projects/dual-arm-robotics.md`
- `src/content/projects/leap-a20.md`
- `src/content/notes/dashgo-navigation-pipeline.md`
- `src/content/notes/differential-vs-ackermann.md`
- `src/content/notes/hierarchical-trajectory-planning.md`
- `src/content/notes/overfitting.md`
- `src/content/notes/paper-reading-method.md`
- `src/content/notes/ppo-for-navigation.md`
- `src/content/notes/spec-driven-development.md`

## 不进入 main 的内容

- `codex/tnhth-v1-implementation`（`8f2298c47269b3641b15580ddb064fd828ea6008`）：旧 publisher、E2E、github-sync，以及 `src/content/work/`、`src/content/writing/` 路径。当前站已经用 `src/content/projects/` 和 `src/content/notes/` 取代这些实现。
- `codex/v10-3-galaxy-content`（`58310baf2c3c8a969c14c13018de01995b54dcc2`）：旧 Galaxy 组件，以及 `config/public-repos.yml`、`public/robots.txt`、`scripts/prepare-sites-runtime.mjs`、`scripts/sync-github.ts`、`src/lib/public-content.ts`、`tests/public-content.test.ts`。
- `feat/personal-homepage-v1`（`acfbea2dc4ee74d37dde4ca1d23751f457e1514b`）：同一套旧 publisher 辅助和旧组件差异。

三支 tip 分别记为 tag `archive-tnhth-v1-implementation`、`archive-v10-3-galaxy-content`、`archive-personal-homepage-v1`。
