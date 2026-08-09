# Plan 3：Publisher V2

## Goal

提供 approval、provenance、revoke、SHA-256 和 content/assets transactional rollback 的本地 Publisher。

## Prerequisites

- Plan 2 完成。
- 测试只使用 temporary Fake Vault；真实 Vault 只能由显式命令配置。

## Files

- `scripts/publisher/**`
- `scripts/sync-vault.ts`
- `scripts/policy.ts`
- `tests/publisher/**`
- `src/data/generated/public-manifest.json`

## Tasks

实现 `publish:plan`、`publish:approve`、`publish:sync`、`publish:verify`、`publish:revoke`；allowlist 使用严格 version 2；撤回保留审计记录；发布清单不暴露私人 source path、原始文件名或 source hash。

## Tests First

覆盖 wrong hash、path traversal、symlink escape、duplicate slug、duplicate approvalId、revoke、manifest privacy 与 replace-B failure rollback。

## Implementation

stage → verify → backup content/assets → replace A → replace B；任一替换失败恢复两者。

## Acceptance Gate

Publisher tests 全部通过；真实 Vault 不因测试被读取或修改；manifest 只含公开 provenance。

## Rollback

保留上一份 content/assets 备份，失败时恢复成操作前状态。

## Expected Commit

`feat: add publisher v2 workflow`
