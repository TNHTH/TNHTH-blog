# Vercel finalize steps

这些步骤只需要 Vercel 账号权限，代码侧已经完成。

1. 在 Vercel 导入 `TNHTH/TNHTH-blog`，Production Branch 设为 `main`。
2. Framework 选择 Astro；Build Command 使用 `pnpm build`，Output Directory 使用 `dist`。
3. 设置 Production 环境变量 `PUBLIC_SITE_URL` 为 Vercel 分配的 `https://<project>.vercel.app`。
4. 触发一次来自已通过 CI 的 `main` 提交的部署。
5. 打开首页、`/work`、`/notes`、`/writing`、`/gallery`、`/about` 和 `/404`，确认 canonical、sitemap 与静态内容正常。
6. 将最终 URL 回填本地 `.env`，再运行 `PUBLIC_SITE_URL=https://<project>.vercel.app pnpm run ci` 做一次交付门复核。

Vault、Publisher allowlist、原始图片和任何凭据都不能添加到 Vercel 环境变量或项目文件中。
