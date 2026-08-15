# TNHTH-blog 仓库协作规则

## 基本原则

- 默认用中文沟通，日期使用 `YYYY-MM-DD`。
- 修改前先读取相关文件并检查旧引用；保留其他人的未提交修改。
- 文件编辑使用可审查的补丁；修改后至少执行测试、构建、lint、解析或 diff 检查中的一种。
- 不把本仓库改造成私人 vault，也不从私人 vault 自动读取内容。

## 公开安全边界

以下内容永远不能提交：私人 vault、私有审批清单、密钥、Token、Cookie、认证头、私钥、数据库、日志、会话、运行时配置、绝对路径、原始日记、HR/Offer/会议材料、未脱敏工作资料、未授权人物照片和未批准附件。高风险内容只能以经过脱敏复核的公开版进入 `src/content`。

发布前必须运行：

```text
pnpm content:verify
pnpm audit:public
pnpm check
pnpm test
pnpm build
```

禁止为了发布而跳过安全扫描、哈希校验、Frontmatter 校验或未解析链接检查。

## 代码与内容真值源

- `src/data/profile.json`：作者姓名、品牌和公开资料。
- `src/content.config.ts`：内容 schema。
- `scripts/publisher.ts`：proposal、人工 allowlist、内部最终校验、原子发布与撤回。
- `scripts/validate-public.ts`：公开快照安全扫描。
- `config/public-repos.yml`：允许同步的公开 GitHub 仓库清单。
- `CONTRIBUTING.md`：维护、部署、撤回和恢复流程。

不要提交 `.openai/hosting.json`；它只用于本地 Sites 项目绑定。

## 品牌和链接

网站与仓库品牌固定为 `TNHTH-blog`，作者姓名固定为“郭伟浩”。管理页编辑入口必须指向 `https://github.com/TNHTH/TNHTH-blog`。调整品牌、域名或仓库时，完成全仓旧引用搜索、canonical 检查、页面路由检查和移动端检查。

## 验证记录

PR 描述必须记录运行过的命令、内容脱敏结果、内部链接与附件检查结果；UI 变化还应记录桌面、768px 与 360px 的页面检查和浏览器控制台结果。

## 一次性实施护栏

- 内容真值模型固定为 `projects + notes`；旧 `/work`、`/writing` 和 `/gallery` 只保留兼容入口。
- Publisher manifest 只能是 proposal；`approved: true` 只能来自仓库外人工控制的 allowlist，并且必须同时匹配 source 与 source SHA-256。
- 同一根因最多进行三次实质不同的修复尝试；不得删除测试、降低断言、关闭安全扫描或改变产品验收标准。
- `.tmp/codex/` 只保存恢复状态、迁移账本和发布日志，不进入 Git 历史。
- 无生产授权时不得 merge `main` 或执行生产部署。
