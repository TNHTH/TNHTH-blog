import { expect, test } from "@playwright/test";

test("在 /notes 页面输入时，本地卡片过滤和 Pagefind 全文结果同步更新", async ({ page }) => {
  await page.goto("/notes");
  await page.fill("#note-search", "过拟合");
  await expect(page.locator("#note-results")).toContainText("过拟合", { timeout: 5_000 });
  await expect(page.locator("#pagefind-search")).toContainText("过拟合", { timeout: 5_000 });
  await page.fill("#note-search", "");
  await expect(page.locator("#pagefind-search")).toBeEmpty({ timeout: 5_000 });
});
