# TNHTH Portfolio

郭伟浩的中文个人网站与公开知识层，展示机器人系统、强化学习实验、工程项目和经过复核的笔记。

## 技术栈

- Astro 6 静态输出、TypeScript、Tailwind CSS。
- Node.js 24、pnpm 10。
- GitHub Actions 对 Pull Request 和 `main` 执行完整检查。
- Vercel 或兼容静态托管平台负责公开部署。

## 常用命令

```text
pnpm install
pnpm dev
pnpm check
pnpm test
pnpm build
pnpm run ci
pnpm hooks:install
```

pnpm 10 将 `pnpm ci` 保留为内置命令，因此本项目的完整交付门使用 `pnpm run ci`。

## 内容工作台

构建后访问 `/admin` 可看到中文内容工作台。它集中列出个人资料、项目、笔记和写作，并提供：

- 打开公开页面；
- 前往对应的 GitHub 在线编辑页；
- 查看待审核修改；
- 查看自动检查结果。

工作台本身不接触账号凭据。编辑权限由 GitHub 官方身份验证和仓库权限控制；未获得仓库写入权限的人只能查看公开内容，不能修改或发布。

推荐发布流程：在线编辑时创建新分支与 Pull Request，等待 `Public snapshot and site checks` 通过，人工复核差异后再合并。公开页面会读取 `main` 分支中的最新资料和既有文章内容；新增路由仍需经过常规代码发布。

## 公开快照流程

私有内容在本仓库之外审核。精确清单记录来源、集合、slug、正文哈希、风险等级和获准附件哈希；同步脚本只把通过审核的快照写入 `src/content` 与 `src/assets`。

```text
私有来源 → 精确清单与 Frontmatter → 哈希检查 → 公开扫描 → 快照 → 构建
```

内容相关命令：

```text
pnpm content:sync     # 本地执行：从已审批来源生成公开快照
pnpm content:verify   # 验证已提交的公开快照
pnpm audit:public     # 扫描秘密、个人信息、路径和私人链接
pnpm sync:github      # 只更新明确列出的公开仓库元数据
pnpm run ci           # 完整交付门
```

高风险派生文档还必须包含 `publicVersion: true` 与 `sanitized: true`。正文或附件哈希发生变化、Frontmatter 缺失、Obsidian 链接未解析、附件未批准或安全扫描失败时，同步会立即终止。

## 安全边界

不得把私人知识库、审批清单、凭据、本地路径、原始日记、HR 材料、内部汇报、未脱敏工作资料或未批准媒体复制进本仓库。公开校验器会拒绝秘密、私人路径、Obsidian 内部链接、违规文件类型和字段不完整的项目内容。

撤回文章时，从私有审批清单移除对应项，重新同步，检查差异并运行 `pnpm run ci`。公开快照是唯一可部署内容，托管平台无法读取或恢复私人知识库。

## 部署参数

```text
Build command: pnpm build
Output directory: dist
Production branch: main
```

托管环境不需要私人知识库路径或 GitHub 写入凭据。自定义域名可通过 `PUBLIC_SITE_URL` 配置 canonical URL。
