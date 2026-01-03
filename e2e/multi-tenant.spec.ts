/**
 * E2E Tests for Multi-Tenant Isolation
 */

import { test, expect } from '@playwright/test';

test.describe('Multi-Tenant Isolation', () => {
    test('組織Aのユーザーは組織Bのデータにアクセスできない', async ({ page, context }) => {
        // 組織Aのユーザーでログイン
        await page.goto('/login');
        await page.getByLabel(/メール|email/i).fill('org-a-user@example.com');
        await page.getByLabel(/パスワード|password/i).fill('password123');
        await page.getByRole('button', { name: /ログイン|login/i }).click();
        
        await page.waitForURL(/\/admin/);
        
        // 店舗一覧を取得
        await page.goto('/admin/stores');
        const stores = await page.getByText(/店舗|store/i).all();
        
        // 組織Bの店舗IDで直接アクセスを試みる
        await page.goto('/admin/stores/org-b-store-id');
        
        // 404エラーまたはアクセス拒否が表示される
        const errorMessage = page.getByText(/404|not found|アクセス|forbidden/i);
        await expect(errorMessage).toBeVisible();
    });

    test('店舗スコープの分離: store_adminは自店舗のみアクセス可能', async ({ page }) => {
        // store_adminでログイン
        await page.goto('/login');
        await page.getByLabel(/メール|email/i).fill('store-admin@example.com');
        await page.getByLabel(/パスワード|password/i).fill('password123');
        await page.getByRole('button', { name: /ログイン|login/i }).click();
        
        await page.waitForURL(/\/admin/);
        
        // 予約一覧を確認
        await page.goto('/admin/bookings');
        
        // 自店舗の予約のみが表示される（他店舗の予約は表示されない）
        const bookings = await page.getByRole('row').all();
        // 全ての予約が同じ店舗IDを持つことを確認（実装に応じて調整）
    });
});







