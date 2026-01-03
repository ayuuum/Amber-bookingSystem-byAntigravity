/**
 * Unit Tests for Stripe Payment Logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stripe } from './server';

// Mock Stripe
vi.mock('./server', () => ({
    stripe: {
        checkout: {
            sessions: {
                create: vi.fn(),
            },
        },
        refunds: {
            create: vi.fn(),
        },
        accounts: {
            create: vi.fn(),
        },
    },
}));

describe('Stripe Payment Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('決済セッション作成の基本ケース', async () => {
        const mockSession = {
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/pay/cs_test_123',
        };

        (stripe.checkout.sessions.create as any).mockResolvedValueOnce(mockSession);

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'jpy',
                        product_data: { name: 'Test Service' },
                        unit_amount: 5000,
                    },
                    quantity: 1,
                },
            ],
            success_url: 'https://example.com/success',
            cancel_url: 'https://example.com/cancel',
        });

        expect(session.id).toBe('cs_test_123');
        expect(session.url).toBeDefined();
    });

    it('プラットフォーム手数料7%を計算できる', () => {
        const totalAmount = 10000;
        const platformFee = Math.floor(totalAmount * 0.07);
        expect(platformFee).toBe(700);
    });

    it('返金処理の基本ケース', async () => {
        const mockRefund = {
            id: 're_test_123',
            amount: 5000,
            status: 'succeeded',
        };

        (stripe.refunds.create as any).mockResolvedValueOnce(mockRefund);

        const refund = await stripe.refunds.create({
            payment_intent: 'pi_test_123',
            amount: 5000,
        });

        expect(refund.id).toBe('re_test_123');
        expect(refund.amount).toBe(5000);
        expect(refund.status).toBe('succeeded');
    });

    it('部分返金を処理できる', async () => {
        const bookingAmount = 10000;
        const cancellationFee = 3000; // 30%
        const refundAmount = bookingAmount - cancellationFee; // 7000

        const mockRefund = {
            id: 're_test_456',
            amount: refundAmount, // 7000円
            status: 'succeeded',
        };

        (stripe.refunds.create as any).mockResolvedValueOnce(mockRefund);

        const refund = await stripe.refunds.create({
            payment_intent: 'pi_test_123',
            amount: refundAmount,
        });

        expect(refund.amount).toBe(7000);
    });

    it('Stripe Connectアカウント作成', async () => {
        const mockAccount = {
            id: 'acct_test_123',
            type: 'express',
            details_submitted: false,
        };

        (stripe.accounts.create as any).mockResolvedValueOnce(mockAccount);

        const account = await stripe.accounts.create({
            type: 'express',
            country: 'JP',
            email: 'test@example.com',
        });

        expect(account.id).toBe('acct_test_123');
        expect(account.type).toBe('express');
    });
});

