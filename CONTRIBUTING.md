# TNHTH-blog 维护规范

本文档是维护者修改站点、资料和公开内容时的操作入口。默认使用中文，所有日期写成 `YYYY-MM-DD`。

## 1. 环境与验证

项目要求 Node.js 24 与 pnpm 10。安装依赖后，至少运行一次完整交付门：

```powershell
pnpm install
pnpm run ci
```

常用开发命令：

```text
pnpm dev             本地开发
pnpm content:verify  校验公开快照
pnpm audit:public    扫描秘密、PII、本地路径与私有链接
pnpm check           Astro 与 TypeScript 检查
pnpm test            Vitest 测试
pnpm build           生产构建
```

## 2. 修改资料

个人资料真值源是 `src/data/profile.json`：

- `name` 保持作者姓名“郭伟浩”。
- `brand` 保持网站品牌 `TNHTH-blog`，页眉、SEO 和工作台使用该字段。
- `github` 必须指向 `https://github.com/TNHTH/TNHTH-blog`。
- 邮箱默认留空，除非作者明确决定公开。

修改后检查首页、About、页脚和 `/admin`，确认作者名与品牌没有互换。

## 3. 新增或修改文章

公开内容位于 `src/content/work`、`src/content/notes` 和 `src/content/writing`。每篇内容都必须符合 `src/content.config.ts` 的 schema，填写标题、摘要、日期、类型、标签等字段；Work 还必须明确 `role`、`contribution`、`status`、`evidence` 和 `repo`。

不要把私人 vault、审批清单、原始日记、HR 聊天、Offer 对比、会议记录、内部汇报、凭据、Cookie、Token、数据库、日志、绝对路径或未经授权的照片复制到这里。来自高风险来源的文章必须先形成脱敏公开版，并在私有审批清单中重新计算哈希；审批清单永不提交到本仓库。

新增内容的建议顺序：

1. 创建单独分支并添加 Markdown 与完整 Frontmatter。
2. 检查 Wikilink、Embed、附件和外部链接；未发布的私人目标不得出现。
3. 运行 `pnpm content:verify`、`pnpm audit:public` 和 `pnpm run ci`。
4. 在 PR 描述中说明来源、脱敏范围、证据边界和截图/路由检查结果。
5. 通过人工复核后合并到 `main`。

## 4. 使用内容工作台

公开站点的 `/admin` 只负责索引和跳转，编辑入口全部是 GitHub 官方 URL。工作台不收集账号密码，不保存 Token，也不绕过 GitHub 权限。没有仓库写入权限时只能浏览，不能修改或发布。

## 5. 部署、撤回与恢复

`main` 合并后由 CI 验证。授权维护者使用通过检查的精确提交部署到 Vercel；构建环境只读取仓库内公开快照，不访问私人 vault。

撤回文章时，先通过 Publisher V2 标记 revoke，再在分支中更新对应公开快照，运行完整交付门并提交 PR。生产故障优先回滚到上一个成功 Vercel deployment，其次回滚 Git 提交后重新验证。发布失败时保留失败日志，修复根因后重新运行相同检查，不要跳过安全扫描。

## 6. 链接和品牌迁移检查

如果调整站点地址、仓库地址或品牌，必须同步检查：`package.json`、`astro.config.mjs`、`.env.example`、`src/data/profile.json`、`src/layouts/BaseLayout.astro`、`src/pages/admin.astro`、README、GitHub Actions 与 canonical URL。完成后全仓搜索旧地址，并用浏览器检查首页、About、内容详情和 `/admin`。

## 7. 本地文件与安全

`.openai/hosting.json` 只保存本地托管项目标识，已被 Git 忽略，不能提交。禁止把私人 vault 根路径或其他本地绝对路径写入公开内容或构建产物。临时截图、日志和审计中间文件放在项目临时目录，确认不需要后再按本地工作区规则处理。
