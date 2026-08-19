# TNHTH-blog

郭伟浩的中文个人站，记录机器人、强化学习、系统工程与经过复核的技术笔记。品牌名是 **TNHTH-blog**，作者姓名仍为“郭伟浩”。

## 快速链接

- [公开网站](https://tnhth-blog.honest-civet-7225.chatgpt.site)
- [内容工作台（/admin）](https://tnhth-blog.honest-civet-7225.chatgpt.site/admin)
- [GitHub 仓库](https://github.com/TNHTH/TNHTH-blog)
- [GitHub Actions](https://github.com/TNHTH/TNHTH-blog/actions)
- [Issues](https://github.com/TNHTH/TNHTH-blog/issues)
- [维护规范](./CONTRIBUTING.md)

## 技术栈

- Astro 6 静态输出、TypeScript、Tailwind CSS
- Node.js 24、pnpm 10
- GitHub Actions 执行公开扫描、类型检查、测试和生产构建
- OpenAI Sites 托管公开快照；构建环境不读取私人 vault

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

由于 pnpm 10 保留了内置 `pnpm ci` 命令，项目完整交付门统一使用 `pnpm run ci`。

## 内容工作台

访问网站的 `/admin` 路由可以快速浏览公开资料、项目、笔记和写作，并跳转到 GitHub 官方在线编辑页。工作台不保存登录信息，也不直接修改仓库；编辑权限、分支、Pull Request 和合并由 GitHub 控制。

推荐流程：从工作台打开编辑入口，在分支中修改，等待 `Public snapshot and site checks` 通过，完成脱敏复核后合并到 `main`。生产站只读取 `main` 中已经提交的公开快照。

## 公开内容边界

公开仓库只包含经过审核的公开快照。私人 vault、审批清单、凭据、本地绝对路径、日记、HR 材料、未授权照片、内部链接、未经核验的贡献描述和未批准附件都不得进入仓库。`40_生活/`、`60_事务/`、`70_工作日志/` 不是一刀切封禁，但高风险来源必须提供脱敏后的公开版并通过扫描。

内容发布链路如下：

```text
私人来源 → 精确审批与哈希 → Frontmatter 校验 → 敏感信息扫描 → 公开快照 → CI → 部署
```

相关命令：

```text
pnpm publisher prepare --dry-run  # 生成 proposal manifest，不修改公开快照
pnpm publisher apply --manifest <file>  # 重新 hash、校验并原子发布
pnpm publisher revoke --entry projects/<slug> --confirm  # 撤回公开内容
pnpm content:verify   # 校验已提交快照
pnpm audit:public     # 扫描秘密、个人信息、路径和私有链接
pnpm run ci           # 完整交付门
```

更多新增、修改、审核、撤回和故障恢复规则见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 部署约定

- `main` 是唯一生产分支；Pull Request 只生成预览或等待检查。
- 发布必须使用已经通过 `pnpm run ci` 的精确提交，不部署未提交内容。
- 站点 canonical 由 `PUBLIC_SITE_URL` 控制，默认值为公开网站地址。
- 管理页设置为 `noindex`，编辑入口始终指向 `https://github.com/TNHTH/TNHTH-blog`。

## 许可证与内容使用

仓库中的文章、项目说明和图片仅代表作者公开、复核后的表达。转载第三方内容前必须确认授权并保留来源；不公开私人笔记或内部材料。
