import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');

    // タイトルに Amber が含まれているか確認
    await expect(page).toHaveTitle(/Amber/i);
});

test('can navigate to login', async ({ page }) => {
    await page.goto('/');

    // ログインリンクを探してクリック (実際の構成に合わせて調整が必要)
    const loginLink = page.getByRole('link', { name: /ログイン|Login/i });
    if (await loginLink.isVisible()) {
        await loginLink.click();
        await expect(page).toHaveURL(/\/login/);
    }
});
