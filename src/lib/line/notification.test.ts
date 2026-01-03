/**
 * Unit Tests for LINE Notification Logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendBookingConfirmationLine, sendBookingCancelledLine } from './notifications';

// Mock LINE client
vi.mock('./client', () => ({
    lineClient: {
        pushMessage: vi.fn(),
    },
}));

// Import after mock
import { lineClient } from './client';

describe('sendBookingConfirmationLine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('予約確認通知を送信できる', async () => {
        const booking = {
            id: 'booking-1',
            start_time: '2024-12-25T10:00:00Z',
            total_amount: 5000,
            payment_method: 'on_site',
            booking_items: [
                {
                    services: { title: 'エアコン清掃' },
                    quantity: 1,
                },
            ],
            customers: {
                address: '東京都渋谷区テスト1-1-1',
            },
        };

        (lineClient.pushMessage as any).mockResolvedValueOnce({});

        await sendBookingConfirmationLine('line-user-id-123', booking);

        expect(lineClient.pushMessage).toHaveBeenCalledWith({
            to: 'line-user-id-123',
            messages: [
                {
                    type: 'text',
                    text: expect.stringContaining('予約が確定しました'),
                },
            ],
        });
    });

    it('複数サービスの予約でも正しくフォーマットされる', async () => {
        const booking = {
            id: 'booking-1',
            start_time: '2024-12-25T10:00:00Z',
            total_amount: 10000,
            payment_method: 'online_card',
            booking_items: [
                {
                    services: { title: 'エアコン清掃' },
                    quantity: 2,
                },
                {
                    services: { title: 'キッチン清掃' },
                    quantity: 1,
                },
            ],
            customers: {
                address: '東京都渋谷区テスト1-1-1',
            },
        };

        (lineClient.pushMessage as any).mockResolvedValueOnce({});

        await sendBookingConfirmationLine('line-user-id-123', booking);

        const callArgs = (lineClient.pushMessage as any).mock.calls[0][0];
        expect(callArgs.messages[0].text).toContain('エアコン清掃 x2');
        expect(callArgs.messages[0].text).toContain('キッチン清掃 x1');
    });

    it('toが空の場合は送信しない', async () => {
        const booking = {
            id: 'booking-1',
            start_time: '2024-12-25T10:00:00Z',
            total_amount: 5000,
            payment_method: 'on_site',
            booking_items: [],
            customers: {},
        };

        await sendBookingConfirmationLine('', booking);

        expect(lineClient.pushMessage).not.toHaveBeenCalled();
    });

    it('エラーが発生しても例外を投げない', async () => {
        const booking = {
            id: 'booking-1',
            start_time: '2024-12-25T10:00:00Z',
            total_amount: 5000,
            payment_method: 'on_site',
            booking_items: [],
            customers: {},
        };

        (lineClient.pushMessage as any).mockRejectedValueOnce(new Error('LINE API Error'));

        await expect(sendBookingConfirmationLine('line-user-id-123', booking)).resolves.not.toThrow();
    });
});

describe('sendBookingCancelledLine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('キャンセル通知を送信できる', async () => {
        const booking = {
            id: 'booking-1',
            start_time: '2024-12-25T10:00:00Z',
        };

        (lineClient.pushMessage as any).mockResolvedValueOnce({});

        await sendBookingCancelledLine('line-user-id-123', booking);

        expect(lineClient.pushMessage).toHaveBeenCalledWith({
            to: 'line-user-id-123',
            messages: [
                {
                    type: 'text',
                    text: expect.stringContaining('予約がキャンセルされました'),
                },
            ],
        });
    });

    it('返金額が指定されている場合は表示される', async () => {
        const booking = {
            id: 'booking-1',
            start_time: '2024-12-25T10:00:00Z',
        };

        (lineClient.pushMessage as any).mockResolvedValueOnce({});

        await sendBookingCancelledLine('line-user-id-123', booking, 7000, 30);

        const callArgs = (lineClient.pushMessage as any).mock.calls[0][0];
        expect(callArgs.messages[0].text).toContain('キャンセル料: 30%');
        expect(callArgs.messages[0].text).toContain('返金額: 7,000円');
    });

    it('返金がない場合はその旨が表示される', async () => {
        const booking = {
            id: 'booking-1',
            start_time: '2024-12-25T10:00:00Z',
        };

        (lineClient.pushMessage as any).mockResolvedValueOnce({});

        await sendBookingCancelledLine('line-user-id-123', booking);

        const callArgs = (lineClient.pushMessage as any).mock.calls[0][0];
        expect(callArgs.messages[0].text).toContain('返金はありません');
    });
});

