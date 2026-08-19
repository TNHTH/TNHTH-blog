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
- `CONTRIBUTING.md`：维护、部署、撤回和恢复流程。

不要提交 `.openai/hosting.json`；它只用于本地 Sites 项目绑定。

## 品牌和链接

网站与仓库品牌固定为 `TNHTH-blog`，作者姓名固定为“郭伟浩”。管理页编辑入口必须指向 `https://github.com/TNHTH/TNHTH-blog`。调整品牌、域名或仓库时，完成全仓旧引用搜索、canonical 检查、页面路由检查和移动端检查。

## 验证记录

PR 描述必须记录运行过的命令、内容脱敏结果、内部链接与附件检查结果；UI 变化还应记录桌面、768px 与 360px 的页面检查和浏览器控制台结果。

## 网页技能路由

本仓库使用以下技能组合，按任务选择最小必要集合，不并行加载重复能力：

- 视觉与界面：`frontend-design` 负责实现，`ui-ux-pro-max` 负责视觉审查；沿用本仓库既定的纸张色、宋体、关系图和内容优先原则，不以通用模板替换产品决策。
- 浏览器验证：优先 `browser` / `agent-browser-verify`；需要 CLI 脚本时使用 `playwright`，需要持久调试会话时使用 `playwright-interactive`。探索性回归优先调用 agent-browser 内置的 `dogfood` 工作流。
- 前端测试与排错：`webapp-testing` 负责用户流程，`code-review` 负责代码风险，`debug` 负责根因定位；同一问题不重复启动等价的浏览器流程。
- Web 质量：`web-quality-audit` 作为总审计入口；按发现的问题再选择 `accessibility`、`performance`、`core-web-vitals`、`seo` 或 `best-practices`，不能把所有专项技能都当作独立主流程重复执行。
- 发布与交付：GitHub 变更使用 `github` / `yeet`，Vercel 预览和生产验证使用 Vercel 部署与验证技能；未获生产授权不得执行 merge 或 Production 部署。

技能来源和接入日期：

- OpenAI curated：`playwright`、`playwright-interactive`，接入日期 `2026-08-16`。
- `addyosmani/web-quality-skills`：`web-quality-audit`、`accessibility`、`performance`、`core-web-vitals`、`seo`、`best-practices`，接入日期 `2026-08-16`。
- 已有 `frontend-design`、`ui-ux-pro-max`、`browser`、`webapp-testing`、`code-review`、`debug` 保持为既有能力，不再安装重复的 `frontend-skill` 或 `frontend-testing-debugging`。

每次 UI 或交互变更至少执行：

```text
pnpm check
pnpm test
pnpm build
pnpm test:e2e
浏览器首屏 + 一个移动视口 + 目标交互 + 控制台错误检查
```

质量审计是趋势和回归信号；当前线上首页基线（`2026-08-16`）为 Performance 98、Accessibility 100、SEO 100、Best Practices 100，不能为了提高分数而牺牲产品语义、隐私边界或无障碍。

## 一次性实施护栏

- 内容真值模型固定为 `projects + notes`；旧 `/work`、`/writing` 和 `/gallery` 只保留兼容入口。
- Publisher manifest 只能是 proposal；`approved: true` 只能来自仓库外人工控制的 allowlist，并且必须同时匹配 source 与 source SHA-256。
- 同一根因最多进行三次实质不同的修复尝试；不得删除测试、降低断言、关闭安全扫描或改变产品验收标准。
- `.tmp/codex/` 只保存恢复状态、迁移账本和发布日志，不进入 Git 历史。
- 无生产授权时不得 merge `main` 或执行生产部署。
