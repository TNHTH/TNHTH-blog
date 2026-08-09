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
- `scripts/sync-vault.ts`、`scripts/validate-public.ts`：发布门与公开扫描。
- `config/public-repos.yml`：允许同步的公开 GitHub 仓库清单。
- `CONTRIBUTING.md`：维护、部署、撤回和恢复流程。

不要提交 `.openai/hosting.json`；它只用于本地 Sites 项目绑定。

## 品牌和链接

网站与仓库品牌固定为 `TNHTH-blog`，作者姓名固定为“郭伟浩”。管理页编辑入口必须指向 `https://github.com/TNHTH/TNHTH-blog`。调整品牌、域名或仓库时，完成全仓旧引用搜索、canonical 检查、页面路由检查和移动端检查。

## 验证记录

PR 描述必须记录运行过的命令、内容脱敏结果、内部链接与附件检查结果；UI 变化还应记录桌面、768px 与 360px 的页面检查和浏览器控制台结果。
