import { test, expect } from '@playwright/test';

test('首页加载正常', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
});
