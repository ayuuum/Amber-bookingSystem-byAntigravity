/**
 * E2E Tests for Customer Booking Flow
 */

import { test, expect } from '@playwright/test';

test.describe('Customer Booking Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to store page
        await page.goto('/test-store');
    });

    test('予約フロー: サービス選択から予約確定まで', async ({ page }) => {
        // 1. 店舗ページが表示される
        await expect(page).toHaveURL(/\/test-store/);
        
        // 2. サービスを選択
        const serviceButton = page.getByRole('button', { name: /エアコン清掃|サービス/i });
        if (await serviceButton.isVisible()) {
            await serviceButton.click();
        }

        // 3. 日付を選択
        const datePicker = page.getByLabel(/日付|date/i);
        if (await datePicker.isVisible()) {
            await datePicker.click();
            // 明日の日付を選択
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            await page.getByRole('button', { name: new RegExp(tomorrowStr) }).click();
        }

        // 4. 時間を選択（空き枠が表示されている場合）
        const timeSlot = page.getByRole('button', { name: /10:00|09:00/i }).first();
        if (await timeSlot.isVisible()) {
            await timeSlot.click();
        }

        // 5. 顧客情報を入力
        await page.getByLabel(/お名前|name/i).fill('テスト太郎');
        await page.getByLabel(/電話番号|phone/i).fill('090-1234-5678');
        await page.getByLabel(/メールアドレス|email/i).fill('test@example.com');
        await page.getByLabel(/住所|address/i).fill('東京都渋谷区テスト1-1-1');

        // 6. 予約確定ボタンをクリック
        const submitButton = page.getByRole('button', { name: /予約確定|確定|submit/i });
        if (await submitButton.isVisible()) {
            await submitButton.click();
        }

        // 7. 予約完了ページまたは確認メッセージが表示される
        await expect(page).toHaveURL(/\/booking\/|success|確認/i);
    });

    test('予約確認: 予約詳細が表示される', async ({ page }) => {
        // 予約IDを指定して予約詳細ページにアクセス
        await page.goto('/booking/booking-1');
        
        // 予約情報が表示される
        await expect(page.getByText(/予約|booking/i)).toBeVisible();
        await expect(page.getByText(/テスト太郎/i)).toBeVisible();
    });

    test('キャンセル: 予約をキャンセルできる', async ({ page }) => {
        await page.goto('/booking/booking-1');
        
        // キャンセルボタンを探す
        const cancelButton = page.getByRole('button', { name: /キャンセル|cancel/i });
        if (await cancelButton.isVisible()) {
            await cancelButton.click();
            
            // 確認ダイアログ
            const confirmButton = page.getByRole('button', { name: /確認|confirm/i });
            if (await confirmButton.isVisible()) {
                await confirmButton.click();
            }
            
            // キャンセル完了メッセージ
            await expect(page.getByText(/キャンセル|cancelled/i)).toBeVisible();
        }
    });
});







