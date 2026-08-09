# Plan 4：GitHub Sync V2

## Goal

只同步 `config/public-repos.yml` 白名单中的公开仓库元数据，并以可恢复 snapshot 方式写入站点。

## Prerequisites

- Plan 2 完成。
- GitHub token 只从运行时环境读取。

## Files

- `scripts/sync-github.ts`
- `src/data/generated/github.json`
- `.github/workflows/github-sync.yml`
- `config/public-repos.yml`
- `tests/github-sync/**`

## Tasks

实现 10 秒超时、ETag/304、Retry-After、有限重试、schema validation、逐仓库失败与 stale fallback；计划任务只创建 PR，不 push main。

## Tests First

覆盖 304、429、500、timeout、schema error、whitelist denial、partial failure 和 atomic replacement。

## Implementation

临时文件完整写入后 rename；失败保留上一份有效 snapshot，并记录 `stale`、`lastSuccessfulSync`、`error`。

## Acceptance Gate

白名单外 repo 无网络请求；普通 CI 保持 read 权限；定时 workflow 权限独立且不直接 push main。

## Rollback

删除候选分支或恢复上一份 generated snapshot。

## Expected Commit

`feat: add resilient github metadata sync`
