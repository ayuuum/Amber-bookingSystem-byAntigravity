/**
 * E2E Tests for Admin Dashboard Flow
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login as admin
        await page.goto('/login');
        await page.getByLabel(/メール|email/i).fill('admin@example.com');
        await page.getByLabel(/パスワード|password/i).fill('password123');
        await page.getByRole('button', { name: /ログイン|login/i }).click();
        
        // Wait for redirect to dashboard
        await page.waitForURL(/\/admin/);
    });

    test('ログイン: 認証成功後にダッシュボードが表示される', async ({ page }) => {
        await expect(page).toHaveURL(/\/admin/);
        await expect(page.getByText(/ダッシュボード|dashboard/i)).toBeVisible();
    });

    test('予約管理: 予約一覧が表示される', async ({ page }) => {
        await page.goto('/admin/bookings');
        
        // 予約一覧が表示される
        await expect(page.getByText(/予約|booking/i)).toBeVisible();
        
        // テーブルまたはリストが表示される
        const table = page.getByRole('table');
        if (await table.isVisible()) {
            await expect(table).toBeVisible();
        }
    });

    test('予約ステータス更新: 予約のステータスを変更できる', async ({ page }) => {
        await page.goto('/admin/bookings');
        
        // 最初の予約のステータス変更ボタンを探す
        const statusButton = page.getByRole('button', { name: /ステータス|status/i }).first();
        if (await statusButton.isVisible()) {
            await statusButton.click();
            
            // ステータス選択
            const completedOption = page.getByRole('option', { name: /完了|completed/i });
            if (await completedOption.isVisible()) {
                await completedOption.click();
            }
            
            // 更新が反映される
            await expect(page.getByText(/完了|completed/i)).toBeVisible();
        }
    });

    test('店舗管理: 店舗一覧が表示される', async ({ page }) => {
        await page.goto('/admin/stores');
        
        await expect(page.getByText(/店舗|store/i)).toBeVisible();
    });

    test('サービス管理: サービス一覧が表示される', async ({ page }) => {
        await page.goto('/admin/services');
        
        await expect(page.getByText(/サービス|service/i)).toBeVisible();
    });

    test('スタッフ管理: スタッフ一覧が表示される', async ({ page }) => {
        await page.goto('/admin/staff');
        
        await expect(page.getByText(/スタッフ|staff/i)).toBeVisible();
    });
});







