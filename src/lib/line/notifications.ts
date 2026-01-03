import { lineClient } from './client';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { retryWithBackoff } from '@/lib/utils/retry';
import { logger } from '@/lib/logger';

export async function sendBookingConfirmationLine(to: string, booking: any) {
    if (!to) return;

    const dateStr = format(new Date(booking.start_time), 'yyyy年MM月dd日(EEEE) HH:mm', { locale: ja });

    const message = `【Amber】予約が確定しました ✨
    
■日時
${dateStr} 〜

■サービス内容
${booking.booking_items?.map((item: any) => `・${item.services?.title} x${item.quantity}`).join('\n')}

■合計金額
${booking.total_amount.toLocaleString()}円 (${booking.payment_method === 'online_card' ? '決済済み' : '現地決済'})

■場所
${booking.customers?.address}

当日、スタッフがお伺いいたします。
よろしくお願いいたします。`;

    const result = await retryWithBackoff(
        async () => {
            await lineClient.pushMessage({
                to,
                messages: [{ type: 'text', text: message }],
            });
        },
        {
            onRetry: (attempt, error) => {
                logger.warn('LINE notification retry', {
                    attempt,
                    error: error.message,
                    bookingId: booking.id,
                    lineUserId: to,
                });
            },
        }
    );

    if (!result.success) {
        logger.error('LINE notification failed after retries', {
            error: result.error?.message,
            attempts: result.attempts,
            totalDuration: result.totalDuration,
            bookingId: booking.id,
            lineUserId: to,
        });
        throw result.error;
    }
}

export async function sendBookingCancelledLine(to: string, booking: any, refundAmount?: number, feePercent?: number) {
    if (!to) return;

    const dateStr = format(new Date(booking.start_time), 'yyyy年MM月dd日(EEEE) HH:mm', { locale: ja });
    const feeLine = feePercent !== undefined ? `キャンセル料: ${feePercent}%\n` : '';
    const refundLine =
        refundAmount !== undefined
            ? `返金額: ${refundAmount.toLocaleString()}円（数営業日でカード会社反映）`
            : '返金はありません。';

    const message = `【Amber】予約がキャンセルされました

■日時
${dateStr}

${feeLine}${refundLine}`;

    const result = await retryWithBackoff(
        async () => {
            await lineClient.pushMessage({
                to,
                messages: [{ type: 'text', text: message }],
            });
        },
        {
            onRetry: (attempt, error) => {
                logger.warn('LINE cancel notification retry', {
                    attempt,
                    error: error.message,
                    bookingId: booking.id,
                    lineUserId: to,
                });
            },
        }
    );

    if (!result.success) {
        logger.error('LINE cancel notification failed after retries', {
            error: result.error?.message,
            attempts: result.attempts,
            totalDuration: result.totalDuration,
            bookingId: booking.id,
            lineUserId: to,
        });
        throw result.error;
    }
}
